import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useAccount } from "./context";
import { AVATAR_PRESETS, getAvatarPreset } from "./avatars";
import type { AvatarId, ClassRoom, GuestProfile } from "./types";
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
  } = useAccount();

  const [tab, setTab] = useState<TabId>("guest");
  const [guestNickname, setGuestNickname] = useState("");
  const [guestAvatar, setGuestAvatar] = useState<AvatarId>("jade");
  const [guestError, setGuestError] = useState<string | null>(null);
  const guestNicknameReady = guestNickname.trim().length > 0;
  const [studentCode, setStudentCode] = useState("");
  const [studentNickname, setStudentNickname] = useState("");
  const [studentAvatar, setStudentAvatar] = useState<AvatarId>("sunrise");
  const [studentError, setStudentError] = useState<string | null>(null);

  const [teacherName, setTeacherName] = useState("");
  const [classTitle, setClassTitle] = useState("");
  const [teacherAvatar, setTeacherAvatar] = useState<AvatarId>("indigo");
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [newClassCode, setNewClassCode] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const guestProfiles = useMemo(() => sortGuests(store.guests), [store.guests]);
  const classRooms = useMemo(() => sortClasses(store.classes), [store.classes]);

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 px-4 py-10 text-white">
      <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-white/60">Welcome</p>
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
                  <h3 className="text-lg font-semibold text-white">Tao ho so khach moi</h3>
                  <p className="mt-1 text-sm text-white/60">
                    Nhap nickname, chon avatar roi keo xuong de bat dau choi.
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
                        placeholder="Nhap nickname"
                      />
                    </div>
                    <AvatarPicker value={guestAvatar} onChange={setGuestAvatar} />
                    {guestError && <p className="text-sm text-rose-300">{guestError}</p>}
                  </div>
                  <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                      Keo xuong duoi va nhan nut de bat dau hanh trinh.
                    </p>
                    <button
                      type="submit"
                      disabled={busy || !guestNicknameReady}
                      className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Bat dau choi
                    </button>
                    <p className="text-xs text-white/60">
                      Ho so se duoc luu lai va ban se vao thang tro choi ngay lap tuc.
                    </p>
                    {!guestNicknameReady && !busy && (
                      <p className="text-xs text-white/80">Vui long nhap nickname truoc khi bat dau.</p>
                    )}
                  </div>
                </form>
              </section>
            )}

            {!loading && tab === "class" && (
              <section className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h2 className="text-lg font-semibold text-white">Học sinh</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Nhập mã lớp, Chọn Nikname và avartar để đồng bộ lên không gian lớp.
                  </p>
                  <form className="mt-4 space-y-4" onSubmit={handleStudentJoin}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                          Mã lớp
                        </label>
                        <input
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                          value={studentCode}
                          onChange={(event) => setStudentCode(event.target.value.toUpperCase())}
                          placeholder="VD: AB12CD"
                        />
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
                    <AvatarPicker value={studentAvatar} onChange={setStudentAvatar} />
                    {studentError && <p className="text-sm text-rose-300">{studentError}</p>}
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Vào
                    </button>
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
                        <AvatarPicker value={teacherAvatar} onChange={setTeacherAvatar} />
                        {teacherError && <p className="text-sm text-rose-300">{teacherError}</p>}
                        {newClassCode && (
                          <div className="rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                            Lớp mới đã được tạo. Mã lớp: <span className="font-semibold">{newClassCode}</span>
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Tạo lớp
                        </button>
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

function AvatarPicker({ value, onChange }: { value: AvatarId; onChange: (id: AvatarId) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Avatar</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {AVATAR_PRESETS.map((preset) => {
          const active = preset.id === value;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition ${
                active
                  ? "border-emerald-400 bg-emerald-500/10 text-white"
                  : "border-white/10 bg-black/20 text-white/70 hover:border-emerald-400/50 hover:text-white"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${preset.background} ${preset.foreground}`}>
                {preset.label.slice(0, 2)}
              </div>
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AvatarBadge({ avatarId, label }: { avatarId: AvatarId; label?: string }) {
  const preset = getAvatarPreset(avatarId);
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${preset.background} ${preset.foreground}`}
    >
      {label ? label.slice(0, 2).toUpperCase() : preset.label.slice(0, 2)}
    </div>
  );
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




