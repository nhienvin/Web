import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearProfileStoreCache, loadProfileStore, saveProfileStore } from "./storage";
import type {
  AvatarId,
  ClassRoom,
  GuestProfile,
  LevelCompletionPayload,
  LevelProgress,
  ProfileStore,
  StudentProfile,
} from "./types";
import { STORE_VERSION, createEmptyStore } from "./types";
import { generateClassCode, generateId } from "./utils";
export type GuestSession = { mode: "guest"; profileId: string };
export type StudentSession = { mode: "student"; classId: string; studentId: string };
export type TeacherSession = { mode: "teacher"; classId: string; teacherId: string };
export type Session = GuestSession | StudentSession | TeacherSession;

type AccountContextValue = {
  store: ProfileStore;
  loading: boolean;
  session: Session | null;
  setSession: (session: Session | null) => void;
  refreshStore: () => Promise<void>;
  createGuestProfile: (input: { nickname: string; avatarId: AvatarId }) => Promise<GuestProfile>;
  createClassRoom: (input: {
    teacherNickname: string;
    avatarId: AvatarId;
    title?: string;
  }) => Promise<ClassRoom>;
  joinClassAsStudent: (input: {
    classId: string;
    nickname: string;
    avatarId: AvatarId;
  }) => Promise<StudentProfile>;
  updateClassRoom: (classId: string, mutator: (room: ClassRoom) => void) => Promise<ClassRoom>;
  recordLevelCompletion: (payload: LevelCompletionPayload) => Promise<void>;
  updateGuestProfile: (
    profileId: string,
    mutator: (profile: GuestProfile) => void,
  ) => Promise<GuestProfile>;
};

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStore(store: ProfileStore | null | undefined): ProfileStore {
  if (!store) {
    return createEmptyStore();
  }
  return {
    version: STORE_VERSION,
    guests: store.guests ?? {},
    classes: store.classes ?? {},
  };
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ProfileStore>(createEmptyStore());
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = normalizeStore(await loadProfileStore());
      if (!mounted) return;
      setStore(loaded);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshStore = useCallback(async () => {
    setLoading(true);
    clearProfileStoreCache();
    const fresh = normalizeStore(await loadProfileStore());
    setStore(fresh);
    setLoading(false);
  }, []);

  const applyStoreMutation = useCallback(
    async <T,>(mutator: (draft: ProfileStore) => T): Promise<T> => {
      let nextStore = createEmptyStore();
      let mutationResult: T;
      setStore((prev) => {
        nextStore = deepClone(prev);
        mutationResult = mutator(nextStore);
        nextStore.version = STORE_VERSION;
        return nextStore;
      });
      await saveProfileStore(nextStore);
      return mutationResult!;
    },
    [],
  );

  const setSession = useCallback((value: Session | null) => {
    setSessionState(value);
  }, []);

  const createGuestProfile = useCallback<AccountContextValue["createGuestProfile"]>(
    async ({ nickname, avatarId }) => {
      const cleaned = nickname.trim();
      const nowIso = new Date().toISOString();
      const profile: GuestProfile = {
        id: generateId("guest"),
        nickname: cleaned.length ? cleaned : "Guest",
        avatarId,
        progress: {},
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await applyStoreMutation((draft) => {
        draft.guests[profile.id] = profile;
        return null;
      });
      setSession({ mode: "guest", profileId: profile.id });
      return profile;
    },
    [applyStoreMutation, setSession],
  );

  const updateGuestProfile = useCallback<AccountContextValue["updateGuestProfile"]>(
    async (profileId, mutator) => {
      const updated = await applyStoreMutation((draft) => {
        const current = draft.guests[profileId];
        if (!current) {
          throw new Error("Guest profile not found");
        }
        const clone = deepClone(current);
        mutator(clone);
        clone.updatedAt = new Date().toISOString();
        draft.guests[profileId] = clone;
        return clone;
      });
      return updated;
    },
    [applyStoreMutation],
  );

  const ensureUniqueClassId = useCallback((classes: ProfileStore["classes"]) => {
    let attempt = "";
    do {
      attempt = generateClassCode();
    } while (classes[attempt]);
    return attempt;
  }, []);

  const createClassRoom = useCallback<AccountContextValue["createClassRoom"]>(
    async ({ teacherNickname, avatarId, title }) => {
      const nowIso = new Date().toISOString();
      const room = await applyStoreMutation((draft) => {
        const classId = ensureUniqueClassId(draft.classes);
        const teacherName = teacherNickname.trim() || "Teacher";
        const newRoom: ClassRoom = {
          id: classId,
          teacher: {
            id: generateId("teacher"),
            nickname: teacherName,
            avatarId,
            createdAt: nowIso,
          },
          title: title?.trim() || undefined,
          students: {},
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        draft.classes[classId] = newRoom;
        return newRoom;
      });
      setSession({
        mode: "teacher",
        classId: room.id,
        teacherId: room.teacher.id,
      });
      return room;
    },
    [applyStoreMutation, ensureUniqueClassId, setSession],
  );

  const updateClassRoom = useCallback<AccountContextValue["updateClassRoom"]>(
    async (classId, mutator) => {
      const updatedRoom = await applyStoreMutation((draft) => {
        const current = draft.classes[classId];
        if (!current) {
          throw new Error("Class not found");
        }
        const clone = deepClone(current);
        mutator(clone);
        clone.updatedAt = new Date().toISOString();
        draft.classes[classId] = clone;
        return clone;
      });
      return updatedRoom;
    },
    [applyStoreMutation],
  );

  const joinClassAsStudent = useCallback<AccountContextValue["joinClassAsStudent"]>(
    async ({ classId, nickname, avatarId }) => {
      const trimmedName = nickname.trim();
      if (!trimmedName) {
        throw new Error("Nickname is required");
      }
      const nowIso = new Date().toISOString();
      const student = await applyStoreMutation((draft) => {
        const room = draft.classes[classId];
        if (!room) {
          throw new Error("Class not found");
        }
        const existingEntry = Object.values(room.students).find(
          (s) => s.nickname.toLowerCase() === trimmedName.toLowerCase(),
        );
        if (existingEntry) {
          const updated: StudentProfile = {
            ...existingEntry,
            avatarId,
            lastSyncAt: nowIso,
          };
          room.students[updated.id] = updated;
          room.updatedAt = nowIso;
          return updated;
        }
        const studentId = generateId("student");
        const profile: StudentProfile = {
          id: studentId,
          nickname: trimmedName,
          avatarId,
          classId,
          progress: {},
          joinedAt: nowIso,
          lastSyncAt: nowIso,
        };
        room.students[studentId] = profile;
        room.updatedAt = nowIso;
        return profile;
      });
      setSession({ mode: "student", classId, studentId: student.id });
      return student;
    },
    [applyStoreMutation, setSession],
  );

  const recordLevelCompletion = useCallback<AccountContextValue["recordLevelCompletion"]>(
    async (payload) => {
      if (!session) {
        return;
      }
      const completedAt = payload.completedAt || new Date().toISOString();
      const computeProgress = (current: LevelProgress | undefined): LevelProgress => {
        const attempts = (current?.attempts ?? 0) + 1;
        let bestTimeMs = current?.bestTimeMs;
        if (typeof payload.ms === "number") {
          bestTimeMs =
            typeof bestTimeMs === "number" ? Math.min(bestTimeMs, payload.ms) : payload.ms;
        }
        return {
          completed: true,
          attempts,
          bestTimeMs,
          lastCompletedAt: completedAt,
        };
      };

      if (session.mode === "guest") {
        await updateGuestProfile(session.profileId, (profile) => {
          profile.progress = {
            ...profile.progress,
            [payload.levelId]: computeProgress(profile.progress[payload.levelId]),
          };
        });
        return;
      }

      if (session.mode === "student") {
        await updateClassRoom(session.classId, (room) => {
          const student = room.students[session.studentId];
          if (!student) {
            return;
          }
          const progress = computeProgress(student.progress[payload.levelId]);
          room.students[session.studentId] = {
            ...student,
            progress: {
              ...student.progress,
              [payload.levelId]: progress,
            },
            lastSyncAt: completedAt,
          };
        });
      }
    },
    [session, updateClassRoom, updateGuestProfile],
  );

  const value = useMemo<AccountContextValue>(
    () => ({
      store,
      loading,
      session,
      setSession,
      refreshStore,
      createGuestProfile,
      createClassRoom,
      joinClassAsStudent,
      updateClassRoom,
      recordLevelCompletion,
      updateGuestProfile,
    }),
    [
      store,
      loading,
      session,
      setSession,
      refreshStore,
      createGuestProfile,
      createClassRoom,
      joinClassAsStudent,
      updateClassRoom,
      recordLevelCompletion,
      updateGuestProfile,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return ctx;
}
