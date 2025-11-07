import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useAccount } from "./context";
import {
  DEFAULT_AVATAR_ID,
  getClassAvatarOptions,
  getPeopleAvatarOptions,
  resolveAvatar,
  type AvatarOption,
} from "./avatars";
import type { AvatarId, ClassRoom, GuestProfile, StudentProfile } from "./types";
import { formatRelativeTime } from "./utils";

type TabId = "guest" | "class";

export default function LoginScreen() {
  const {
    store,
    loading,
    setSession,
    createGuestProfile,
    joinClassAsStudent,
    createClassRoom,
    updateClassRoom,
  } = useAccount();

  const [tab, setTab] = useState<TabId>("guest");
  const [guestNickname, setGuestNickname] = useState("");
  const peopleAvatarOptions = useMemo(() => getPeopleAvatarOptions(), []);
  const classAvatarOptions = useMemo(() => getClassAvatarOptions(), []);
  const [guestAvatar, setGuestAvatar] = useState<AvatarId>(peopleAvatarOptions[0]?.id ?? DEFAULT_AVATAR_ID);
  const [guestError, setGuestError] = useState<string | null>(null);
  const guestNicknameReady = guestNickname.trim().length > 0;
  const [studentCode, setStudentCode] = useState("");
  const [studentNickname, setStudentNickname] = useState("");
  const [studentAvatar, setStudentAvatar] = useState<AvatarId>(peopleAvatarOptions[0]?.id ?? DEFAULT_AVATAR_ID);
  const [studentError, setStudentError] = useState<string | null>(null);

  const [teacherName, setTeacherName] = useState("");
  const [classTitle, setClassTitle] = useState("");
  const [teacherAvatar, setTeacherAvatar] = useState<AvatarId>(classAvatarOptions[0]?.id ?? DEFAULT_AVATAR_ID);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [newClassCode, setNewClassCode] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const guestProfiles = useMemo(() => sortGuests(store.guests), [store.guests]);
  const classRooms = useMemo(() => sortClasses(store.classes), [store.classes]);
  const selectedClassRoom = useMemo(
    () => classRooms.find((room) => room.id === studentCode) ?? null,
    [classRooms, studentCode],
  );
  const studentProfilesForClass = useMemo(
    () => (selectedClassRoom ? sortStudents(selectedClassRoom.students) : []),
    [selectedClassRoom],
  );

  async function handleCreateGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!guestNickname.trim()) {
      setGuestError("Nickname is required");
      return;
    }
    setBusy(true);
    setGuestError(null);
    try {
      const profile = await createGuestProfile({ nickname: guestNickname, avatarId: guestAvatar });
      setSession({ mode: "guest", profileId: profile.id });
      setGuestNickname("");
    } catch (error) {
      setGuestError(normalizeError(error, "Failed to create guest"));
    } finally {
      setBusy(false);
    }
  }

  async function handleStudentJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!studentCode.trim()) {
      setStudentError("Class code is required");
      return;
    }
    if (!studentNickname.trim()) {
      setStudentError("Nickname is required");
      return;
    }
    setBusy(true);
    setStudentError(null);
    try {
      await joinClassAsStudent({
        classId: studentCode.trim().toUpperCase(),
        nickname: studentNickname,
        avatarId: studentAvatar,
      });
      setStudentNickname("");
      setStudentCode("");
    } catch (error) {
      setStudentError(normalizeError(error, "Cannot join class"));
    } finally {
      setBusy(false);
    }
  }


  async function handleExistingStudentLogin(classId: string, studentId: string) {
    if (busy) return;
    setBusy(true);
    setStudentError(null);
    try {
      const nowIso = new Date().toISOString();
      await updateClassRoom(classId, (room) => {
        const student = room.students[studentId];
        if (!student) {
          throw new Error("Không tìm thấy học sinh");
        }
        room.students[studentId] = {
          ...student,
          lastSyncAt: nowIso,
        };
        room.updatedAt = nowIso;
      });
      setSession({ mode: "student", classId, studentId });
    } catch (error) {
      setStudentError(normalizeError(error, "Không thể đăng nhập bằng tài khoản học sinh này"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!teacherName.trim()) {
      setTeacherError("Teacher name is required");
      return;
    }
    setBusy(true);
    setTeacherError(null);
    try {
      const room = await createClassRoom({
        teacherNickname: teacherName,
        avatarId: teacherAvatar,
        title: classTitle,
      });
      setNewClassCode(room.id);
      setTeacherName("");
      setClassTitle("");
    } catch (error) {
      setTeacherError(normalizeError(error, "Failed to create class"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen max-h-screen w-full items-start justify-center overflow-y-auto bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 px-4 py-10 text-white">
      <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-white/60">Chào mừng bạn tới enterVN.</p>
            <h1 className="text-3xl font-semibold">Chọn chế độ bắt đầu</h1>
            <p className="max-w-md text-sm text-white/70">
              Đăng nhập lưu tiến độ người chơi hoặc quản lý lớp học. Bạn có thể quay lại bất cứ lúc nào.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setTab("guest")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  tab === "guest" ? "bg-emerald-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                Chế độ khách
              </button>
              <button
                type="button"
                onClick={() => setTab("class")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  tab === "class" ? "bg-emerald-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                Chế độ lớp học
              </button>
            </div>

            {loading && <p className="text-sm text-white/60">Đang tải dữ liệu...</p>}

            {!loading && tab === "guest" && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Khách đã lưu</h2>
                  {guestProfiles.length === 0 && (
                    <p className="mt-2 text-sm text-white/60">
                      Chưa có hồ sơ nào. Mời tạo hồ sơ bên dưới
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {guestProfiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => setSession({ mode: "guest", profileId: profile.id })}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-emerald-400/60 hover:bg-emerald-500/10"
                      >
                        <div className="flex items-center gap-3">
                          <AvatarBadge avatarId={profile.avatarId} />
                          <div>
                            <p className="text-sm font-semibold text-white">{profile.nickname}</p>
                            <p className="text-xs text-white/60">
                            Cập nhật {formatRelativeTime(profile.updatedAt)}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                        Bắt đầu
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <form className="rounded-2xl border border-white/10 bg-white/5 p-5" onSubmit={handleCreateGuest}>
                  <h3 className="text-lg font-semibold text-white">Tạo hồ sơ khách mới</h3>
                  <p className="mt-1 text-sm text-white/60">
                    Nhập nickname, chọn avatar rồi kéo xuống để bắt đầu chơi.
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                        Nickname
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                        value={guestNickname}
                        onChange={(event) => setGuestNickname(event.target.value)}
                        placeholder="Nhập nickname"
                      />
                    </div>
                    <AvatarPicker value={guestAvatar} onChange={setGuestAvatar} options={peopleAvatarOptions} />
                    {guestError && <p className="text-sm text-rose-300">{guestError}</p>}
                  </div>
                  <div className="mt-4 space-y-4 flex justify-center">
                  <button
                    type="submit"
                    disabled={busy || !guestNicknameReady}
                    className="w-3xs rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Bắt đầu
                  </button>
                  </div>
                </form>
              </section>
            )}

            {!loading && tab === "class" && (
              <section className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h2 className="text-lg font-semibold text-white">Học sinh</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Chọn mã lớp trong danh sách, nhập nickname và chọn avatar để vào lớp.
                  </p>
                  <form className="mt-4 space-y-4" onSubmit={handleStudentJoin}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                          Chọn mã lớp
                        </label>
                        <select
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                          value={studentCode}
                          onChange={(event) => {
                            setStudentCode(event.target.value.toUpperCase());
                            setStudentError(null);
                          }}
                        >
                          <option value="" disabled>Chọn mã lớp</option>
                          {classRooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.id} — {room.title ?? "Lớp không tên"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                          Nickname
                        </label>
                        <input
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                          value={studentNickname}
                          onChange={(event) => setStudentNickname(event.target.value)}
                          placeholder="Nhập nickname"
                        />
                      </div>
                    </div>

                    {selectedClassRoom && (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                            Học sinh đã có tài khoản
                          </h4>
                          <span className="text-xs text-white/60">
                            {studentProfilesForClass.length} tài khoản
                          </span>
                        </div>
                        {studentProfilesForClass.length === 0 ? (
                          <p className="mt-3 text-sm text-white/60">
                            Chưa có tài khoản nào trong lớp này. Sử dụng biểu mẫu bên dưới để tạo mới.
                          </p>
                        ) : (
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {studentProfilesForClass.map((student) => (
                              <button
                                key={student.id}
                                type="button"
                                disabled={busy}
                                onClick={() => handleExistingStudentLogin(selectedClassRoom.id, student.id)}
                                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-emerald-400/60 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <div className="flex items-center gap-3">
                                  <AvatarBadge avatarId={student.avatarId} label={student.nickname} />
                                  <div>
                                    <p className="text-sm font-semibold text-white">{student.nickname}</p>
                                    <p className="text-xs text-white/60">
                                      Hoạt động {formatRelativeTime(student.lastSyncAt)}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                                  Chơi ngay
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

<AvatarPicker value={studentAvatar} onChange={setStudentAvatar} options={peopleAvatarOptions} />
                    {studentError && <p className="text-sm text-rose-300">{studentError}</p>}
                    <div className="mt-4 space-y-4 flex justify-center">
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-3xs rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Vào
                    </button>
                    </div>
                  </form>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h2 className="text-lg font-semibold text-white">Giáo viên</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Tạo mã lớp hoặc truy cập lớp hiện có để theo dõi tiến độ học sinh.
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
                        Lớp hiện có
                      </h3>
                      {classRooms.length === 0 && (
                        <p className="mt-2 text-sm text-white/60">Chưa có lớp nào được tạo.</p>
                      )}
                      <div className="mt-3 space-y-3">
                        {classRooms.map((room) => (
                          <button
                            key={room.id}
                            type="button"
                            onClick={() =>
                              setSession({ mode: "teacher", classId: room.id, teacherId: room.teacher.id })
                            }
                            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-emerald-400/60 hover:bg-emerald-500/10"
                          >
                            <div className="flex items-center gap-3">
                              <AvatarBadge avatarId={room.teacher.avatarId} label={room.id} />
                              <div>
                                <p className="text-sm font-semibold text-white">{room.title ?? "Lop khong ten"}</p>
                                <p className="text-xs text-white/60">
                                  Mã: {room.id} • {Object.keys(room.students).length} học sinh
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                              Quản lý
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <form className="rounded-2xl border border-dashed border-white/20 bg-black/10 p-4" onSubmit={handleCreateClass}>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
                        Tạo lớp mới
                      </h3>
                      <div className="mt-3 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                              Tên giáo viên
                            </label>
                            <input
                              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                              value={teacherName}
                              onChange={(event) => setTeacherName(event.target.value)}
                              placeholder="Nhập tên"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                              Tên lớp( Tự chọn)
                            </label>
                            <input
                              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                              value={classTitle}
                              onChange={(event) => setClassTitle(event.target.value)}
                              placeholder="VD: Lớp 5A"
                            />
                          </div>
                        </div>
                        <AvatarPicker value={teacherAvatar} onChange={setTeacherAvatar} options={classAvatarOptions} />
                        {teacherError && <p className="text-sm text-rose-300">{teacherError}</p>}
                        {newClassCode && (
                          <div className="rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                            Lớp mới đã được tạo. Mã lớp: <span className="font-semibold">{newClassCode}</span>
                          </div>
                        )}
                        <div className="mt-4 space-y-4 flex justify-center">
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-3xs rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Tạo lớp
                        </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AvatarPicker({
  value,
  onChange,
  options,
}: {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  options: AvatarOption[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Avatar</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
      {options.map((option) => {
          const active = option.id === value;
          return (
            <button
            key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition ${
                active
                  ? "border-emerald-400 bg-emerald-500/10 text-white"
                  : "border-white/10 bg-black/20 text-white/70 hover:border-emerald-400/50 hover:text-white"
              }`}
            >
              {option.kind === "image" ? (
                <img
                  src={option.url}
                  alt={option.label}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${option.background} ${option.foreground}`}
                >
                  {option.label.slice(0, 2).toUpperCase()}
                </div>
              )}
              {/* <span>{option.label}</span> */}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AvatarBadge({ avatarId, label }: { avatarId: AvatarId; label?: string }) {
  const avatar = resolveAvatar(avatarId);
  if (avatar.kind === "image") {
    return (
      <img
        src={avatar.url}
        alt={label ?? avatar.label}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  const text = (label ?? avatar.label).slice(0, 2).toUpperCase();
  return (
    <div
    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${avatar.background} ${avatar.foreground}`}
    >
      {text}
    </div>
  );
}

function sortStudents(map: Record<string, StudentProfile>): StudentProfile[] {
  return Object.values(map).sort((a, b) => dateValue(b.lastSyncAt) - dateValue(a.lastSyncAt));
}

function sortGuests(map: Record<string, GuestProfile>): GuestProfile[] {
  return Object.values(map).sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt));
}

function sortClasses(map: Record<string, ClassRoom>): ClassRoom[] {
  return Object.values(map).sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt));
}

function dateValue(input?: string): number {
  if (!input) return 0;
  const value = Date.parse(input);
  return Number.isNaN(value) ? 0 : value;
}

function normalizeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}




