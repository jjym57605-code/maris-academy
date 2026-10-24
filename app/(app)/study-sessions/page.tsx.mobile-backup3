
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { getSession, getProfile } from "@/services/auth";

type Subject = {
  id: string;
  name: string;
  stream: string | null;
};

type StudySession = {
  id: string;
  user_id: string;
  subject_id: string | null;
  session_type: "free" | "pomodoro";
  status: "active" | "paused" | "completed" | "cancelled";
  started_at: string;
  study_seconds: number;
  break_seconds: number;
  pomodoro_work_seconds: number;
  pomodoro_break_seconds: number;
  completed_pomodoros: number;
  notes: string | null;
  room_id?: string | null;
};

type StudyRoom = {
  id: string;
  host_user_id: string;
  subject_id: string | null;
  session_type: "free" | "pomodoro";
  status: "active" | "closed";
  invite_code: string;
  pomodoro_work_seconds: number;
  pomodoro_break_seconds: number;
  created_at: string;
};

type LeaderboardEntry = {
  user_id: string;
  first_name: string;
  last_name: string;
  stream: string | null;
  total_study_seconds: number;
  completed_sessions: number;
  completed_pomodoros: number;
};

type Theme = {
  id: string;
  name: string;
  description: string;
  background: string;
  accent: string;
};

const THEMES: Theme[] = [
  {
    id: "ocean",
    name: "أعماق المحيط",
    description: "هدوء الأعماق",
    background:
      "radial-gradient(ellipse at 50% 0%, #164e63 0%, #071b35 48%, #020617 100%)",
    accent: "#67e8f9",
  },
  {
    id: "midnight",
    name: "منتصف الليل",
    description: "تركيز بلا حدود",
    background:
      "radial-gradient(ellipse at 50% 0%, #312e81 0%, #111127 48%, #050510 100%)",
    accent: "#c4b5fd",
  },
  {
    id: "forest",
    name: "الغابة",
    description: "راحة الطبيعة",
    background:
      "radial-gradient(ellipse at 50% 0%, #14532d 0%, #10291f 48%, #04130d 100%)",
    accent: "#86efac",
  },
  {
    id: "sunset",
    name: "الغروب",
    description: "دفء وهدوء",
    background:
      "radial-gradient(ellipse at 50% 0%, #7c2d12 0%, #431b32 48%, #160c20 100%)",
    accent: "#fdba74",
  },
  {
    id: "black",
    name: "التركيز الداكن",
    description: "بساطة كاملة",
    background:
      "radial-gradient(ellipse at 50% 0%, #27272a 0%, #18181b 48%, #09090b 100%)",
    accent: "#e4e4e7",
  },
];

const SOUNDS = [
  { id: "off", label: "بدون صوت", icon: "🔇" },
  { id: "rain", label: "المطر والعاصفة", icon: "🌧️" },
  { id: "birds", label: "زقزقة الطيور", icon: "🐦" },
  { id: "ocean", label: "أمواج البحر", icon: "🌊" },
] as const;

type SoundId = (typeof SOUNDS)[number]["id"];

const SOUND_SOURCES: Partial<Record<SoundId, string>> = {
  rain: "/sounds/rain.wav",
  birds: "/sounds/birds.wav",
  ocean: "/sounds/ocean.wav",
};

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  return [hours, minutes, secs]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function formatHours(seconds: number) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (hours === 0) return `${minutes} د`;
  return `${hours} س ${minutes} د`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export default function StudySessionsPage() {
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get("invite") ?? "";

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [sessionType, setSessionType] = useState<"free" | "pomodoro">(
    "pomodoro"
  );

  const [studySeconds, setStudySeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [phaseSeconds, setPhaseSeconds] = useState(0);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  const [running, setRunning] = useState(false);
  const [session, setSession] = useState<StudySession | null>(null);

  const [themeId, setThemeId] = useState("ocean");
  const [sound, setSound] = useState<SoundId>("off");
  const [volume, setVolume] = useState(20);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<StudySession[]>([]);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [roomBusy, setRoomBusy] = useState(false);
  const [showRooms, setShowRooms] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveBusyRef = useRef(false);
  const inviteHandledRef = useRef(false);

  const latestRef = useRef({
    studySeconds: 0,
    breakSeconds: 0,
    completedPomodoros: 0,
    notes: "",
    phase: "work" as "work" | "break",
    sessionType: "pomodoro" as "free" | "pomodoro",
    running: false,
    sessionId: "",
    phaseSeconds: 0,
  });

  const theme = THEMES.find((item) => item.id === themeId) ?? THEMES[0];

  useEffect(() => {
    latestRef.current = {
      studySeconds,
      breakSeconds,
      completedPomodoros,
      notes,
      phase,
      sessionType,
      running,
      sessionId: session?.id ?? "",
      phaseSeconds,
    };
  }, [
    studySeconds,
    breakSeconds,
    completedPomodoros,
    notes,
    phase,
    sessionType,
    running,
    session,
    phaseSeconds,
  ]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await supabase.rpc(
        "get_study_leaderboard",
        { p_limit: 50 }
      );

      if (error) throw error;

      setLeaderboard((data ?? []) as LeaderboardEntry[]);
    } catch (error) {
      setErrorMessage(
        `تعذّر تحميل ترتيب الطلبة: ${getErrorMessage(error)}`
      );
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error(
          "تعذّر الاتصال بقاعدة البيانات. أعد تحميل الصفحة."
        );
      }

      const authSession = await getSession(supabase);

      if (!authSession?.user) {
        setErrorMessage(
          "لازم تسجّل الدخول باش تستعمل الجلسات الدراسية."
        );
        return;
      }

      const id = authSession.user.id;
      setUserId(id);

      const profile = await getProfile(supabase, id);

      let subjectsQuery = supabase
        .from("subjects")
        .select("id, name, stream")
        .order("name");

      if (profile?.stream) {
        subjectsQuery = subjectsQuery.or(
          `stream.is.null,stream.eq.${profile.stream}`
        );
      }

      const { data: subjectsData, error: subjectsError } =
        await subjectsQuery;

      if (subjectsError) throw subjectsError;
      setSubjects((subjectsData ?? []) as Subject[]);

      const { data: activeData, error: activeError } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", id)
        .in("status", ["active", "paused"])
        .order("started_at", { ascending: false })
        .limit(1);

      if (activeError) throw activeError;

      const active = (activeData?.[0] ?? null) as StudySession | null;

      if (active) {
        setSession(active);
        setSubjectId(active.subject_id ?? "");
        setSessionType(active.session_type);
        setStudySeconds(active.study_seconds);
        setBreakSeconds(active.break_seconds);
        setCompletedPomodoros(active.completed_pomodoros);
        setWorkMinutes(
          Math.max(1, Math.round(active.pomodoro_work_seconds / 60))
        );
        setBreakMinutes(
          Math.max(1, Math.round(active.pomodoro_break_seconds / 60))
        );
        setNotes(active.notes ?? "");
        setRunning(false);
        setPhaseSeconds(0);
        setPhase("work");

        if (active.room_id) {
          const { data: roomData } = await supabase
            .from("study_rooms")
            .select("*")
            .eq("id", active.room_id)
            .maybeSingle();

          if (roomData) {
            setRoom(roomData as StudyRoom);
          }
        } else {
          setRoom(null);
        }

        setMessage("استرجعنا آخر جلسة محفوظة. تقدر تكملها.");
      } else {
        setSession(null);
        setRoom(null);
      }

      const { data: historyData, error: historyError } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", id)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(20);

      if (historyError) throw historyError;

      const completedHistory = (historyData ?? []) as StudySession[];
      setHistory(completedHistory);

      setTotalSeconds(
        completedHistory.reduce(
          (sum, item) => sum + (item.study_seconds ?? 0),
          0
        )
      );

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: todayData, error: todayError } = await supabase
        .from("study_sessions")
        .select("study_seconds")
        .eq("user_id", id)
        .gte("started_at", startOfDay.toISOString())
        .in("status", ["active", "paused", "completed"]);

      if (todayError) throw todayError;

      setTodaySeconds(
        (todayData ?? []).reduce(
          (sum, item) => sum + (item.study_seconds ?? 0),
          0
        )
      );

      await loadLeaderboard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [loadLeaderboard]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (
      loading ||
      !userId ||
      !inviteFromUrl ||
      inviteHandledRef.current
    ) {
      return;
    }

    inviteHandledRef.current = true;
    setInviteCodeInput(normalizeInviteCode(inviteFromUrl));
    setShowRooms(true);
    setMessage("وصلت عبر رابط دعوة. اضغط «انضم للغرفة» للمتابعة.");
  }, [loading, userId, inviteFromUrl]);

  // الأصوات الطبيعية أثناء تشغيل جلسة الدراسة فقط.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (sound === "off") {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    const source = SOUND_SOURCES[sound];

    if (!source) {
      audio.pause();
      setErrorMessage("مسار الملف الصوتي غير محدد.");
      return;
    }

    audio.pause();
    audio.src = source;
    audio.loop = true;
    audio.volume = volume / 100;
    audio.load();

    if (running && volume > 0) {
      void audio.play().catch(() => {
        setMessage(
          "ما قدرناش نشغلو الصوت. تأكد من وجود الملف داخل public/sounds."
        );
      });
    }

    return () => {
      audio.pause();
    };
  }, [sound, running]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume / 100;

    if (volume === 0 || !running || sound === "off") {
      audio.pause();
    } else if (audio.src) {
      void audio.play().catch(() => undefined);
    }
  }, [volume, running, sound]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, []);

  const saveSession = useCallback(
    async (status?: StudySession["status"]) => {
      const current = latestRef.current;

      if (!current.sessionId || saveBusyRef.current) return;

      saveBusyRef.current = true;
      setSaving(true);

      try {
        const supabase = getSupabase();

        if (!supabase) {
          throw new Error("تعذّر الاتصال بقاعدة البيانات.");
        }

        const { error } = await supabase
          .from("study_sessions")
          .update({
            subject_id: subjectId || null,
            session_type: current.sessionType,
            status: status ?? (current.running ? "active" : "paused"),
            study_seconds: current.studySeconds,
            break_seconds: current.breakSeconds,
            pomodoro_work_seconds: workMinutes * 60,
            pomodoro_break_seconds: breakMinutes * 60,
            completed_pomodoros: current.completedPomodoros,
            notes: current.notes || null,
            ended_at:
              status === "completed" || status === "cancelled"
                ? new Date().toISOString()
                : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", current.sessionId)
          .eq("user_id", userId);

        if (error) throw error;
      } catch (error) {
        setErrorMessage(
          `تعذّر حفظ الجلسة: ${getErrorMessage(error)}`
        );
      } finally {
        saveBusyRef.current = false;
        setSaving(false);
      }
    },
    [subjectId, workMinutes, breakMinutes, userId]
  );

  useEffect(() => {
    if (!running) return;

    const interval = window.setInterval(() => {
      setPhaseSeconds((current) => {
        const next = current + 1;

        if (
          latestRef.current.sessionType === "pomodoro" &&
          latestRef.current.phase === "work" &&
          next >= workMinutes * 60
        ) {
          setCompletedPomodoros((value) => value + 1);
          setPhase("break");
          setMessage("برافو! كملت فترة تركيز. خذ استراحة قصيرة.");
          return 0;
        }

        if (
          latestRef.current.sessionType === "pomodoro" &&
          latestRef.current.phase === "break" &&
          next >= breakMinutes * 60
        ) {
          setPhase("work");
          setMessage("الاستراحة كملت. ارجع ركّز!");
          return 0;
        }

        return next;
      });

      if (
        latestRef.current.phase === "break" &&
        latestRef.current.sessionType === "pomodoro"
      ) {
        setBreakSeconds((value) => value + 1);
      } else {
        setStudySeconds((value) => value + 1);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running, workMinutes, breakMinutes]);

  useEffect(() => {
    if (!session || !running) return;

    const interval = window.setInterval(() => {
      void saveSession("active");
    }, 15000);

    return () => window.clearInterval(interval);
  }, [session, running, saveSession]);

  useEffect(() => {
    const handleUnload = () => {
      const current = latestRef.current;
      if (!current.sessionId) return;

      const supabase = getSupabase();
      if (!supabase) return;

      void supabase
        .from("study_sessions")
        .update({
          study_seconds: current.studySeconds,
          break_seconds: current.breakSeconds,
          completed_pomodoros: current.completedPomodoros,
          notes: current.notes || null,
          status: current.running ? "active" : "paused",
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.sessionId)
        .eq("user_id", userId);
    };

    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, [userId]);

  const beginSession = async () => {
    setErrorMessage("");
    setMessage("");

    try {
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("تعذّر الاتصال بقاعدة البيانات.");
      }

      const authSession = await getSession(supabase);

      if (!authSession?.user) {
        setErrorMessage("سجّل الدخول أولاً.");
        return;
      }

      if (session) {
        const { error } = await supabase
          .from("study_sessions")
          .update({
            status: "active",
            subject_id: subjectId || null,
            session_type: sessionType,
            notes: notes || null,
            pomodoro_work_seconds: workMinutes * 60,
            pomodoro_break_seconds: breakMinutes * 60,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.id)
          .eq("user_id", authSession.user.id);

        if (error) throw error;

        setSession({ ...session, status: "active" });
      } else {
        const { data, error } = await supabase
          .from("study_sessions")
          .insert({
            user_id: authSession.user.id,
            subject_id: subjectId || null,
            session_type: sessionType,
            status: "active",
            study_seconds: 0,
            break_seconds: 0,
            pomodoro_work_seconds: workMinutes * 60,
            pomodoro_break_seconds: breakMinutes * 60,
            completed_pomodoros: 0,
            notes: notes || null,
            room_id: room?.id ?? null,
          })
          .select("*")
          .single();

        if (error) throw error;

        setSession(data as StudySession);
        setStudySeconds(0);
        setBreakSeconds(0);
        setPhaseSeconds(0);
        setCompletedPomodoros(0);
        setPhase("work");
      }

      setRunning(true);
      setMessage("بدأت الجلسة. بالتوفيق!");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const pauseSession = async () => {
    setRunning(false);
    await saveSession("paused");
    setMessage("الجلسة متوقفة مؤقتاً، وقتك محفوظ.");
  };

  const finishSession = async () => {
    if (!session) return;

    setRunning(false);
    await saveSession("completed");
    setSession(null);
    setPhaseSeconds(0);
    setMessage("تم إنهاء الجلسة وحفظها بنجاح.");

    await loadData();
  };

  const cancelSession = async () => {
    if (!session) return;

    const confirmed = window.confirm(
      "هل تريد إلغاء هذه الجلسة؟ سيتم حفظ وقتها كجلسة ملغاة."
    );

    if (!confirmed) return;

    setRunning(false);
    await saveSession("cancelled");
    setSession(null);
    setStudySeconds(0);
    setBreakSeconds(0);
    setPhaseSeconds(0);
    setCompletedPomodoros(0);
    setRoom(null);
    setMessage("تم إلغاء الجلسة.");
  };

  const resetPhase = () => {
    setPhaseSeconds(0);
    setPhase("work");
    setMessage("تمت إعادة ضبط مؤقّت الفترة.");
  };

  // إنشاء غرفة عبر دالة Supabase؛ الدالة تنشئ جلسة شخصية للمضيف.
  const createRoom = async () => {
    setRoomBusy(true);
    setErrorMessage("");
    setMessage("");

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("تعذّر الاتصال بقاعدة البيانات.");

      if (session) {
        throw new Error(
          "عندك جلسة مفتوحة بالفعل. أنهِها أو أوقفها قبل إنشاء غرفة."
        );
      }

      const { data, error } = await supabase.rpc("create_study_room", {
        p_subject_id: subjectId || null,
        p_session_type: sessionType,
        p_pomodoro_work_seconds: workMinutes * 60,
        p_pomodoro_break_seconds: breakMinutes * 60,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.room_id || !result?.study_session_id) {
        throw new Error("الغرفة تخلقت لكن ما قدرناش نجيبو بيانات الجلسة.");
      }

      const [{ data: roomData, error: roomError }, { data: sessionData, error: sessionError }] =
        await Promise.all([
          supabase
            .from("study_rooms")
            .select("*")
            .eq("id", result.room_id)
            .single(),
          supabase
            .from("study_sessions")
            .select("*")
            .eq("id", result.study_session_id)
            .eq("user_id", userId)
            .single(),
        ]);

      if (roomError) throw roomError;
      if (sessionError) throw sessionError;

      setRoom(roomData as StudyRoom);
      setSession(sessionData as StudySession);
      setSessionType(sessionData.session_type);
      setStudySeconds(sessionData.study_seconds);
      setBreakSeconds(sessionData.break_seconds);
      setCompletedPomodoros(sessionData.completed_pomodoros);
      setRunning(false);
      setShowRooms(true);
      setMessage("الغرفة تخلقت بنجاح! شارك الرابط مع زملائك.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRoomBusy(false);
    }
  };

  // كل انضمام ينشئ صف study_sessions مستقلًا للطالب.
  const joinRoom = async () => {
    const code = normalizeInviteCode(inviteCodeInput);

    if (!code) {
      setErrorMessage("اكتب كود الدعوة أولاً.");
      return;
    }

    setRoomBusy(true);
    setErrorMessage("");
    setMessage("");

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("تعذّر الاتصال بقاعدة البيانات.");

      if (session) {
        throw new Error(
          "عندك جلسة مفتوحة بالفعل. أنهِها أو أوقفها قبل الانضمام."
        );
      }

      const { data, error } = await supabase.rpc("join_study_room", {
        p_invite_code: code,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.room_id || !result?.study_session_id) {
        throw new Error("ما قدرناش نجيبو بيانات الغرفة بعد الانضمام.");
      }

      const [{ data: roomData, error: roomError }, { data: sessionData, error: sessionError }] =
        await Promise.all([
          supabase
            .from("study_rooms")
            .select("*")
            .eq("id", result.room_id)
            .single(),
          supabase
            .from("study_sessions")
            .select("*")
            .eq("id", result.study_session_id)
            .eq("user_id", userId)
            .single(),
        ]);

      if (roomError) throw roomError;
      if (sessionError) throw sessionError;

      const joinedSession = sessionData as StudySession;

      setRoom(roomData as StudyRoom);
      setSession(joinedSession);
      setSubjectId(joinedSession.subject_id ?? "");
      setSessionType(joinedSession.session_type);
      setStudySeconds(joinedSession.study_seconds);
      setBreakSeconds(joinedSession.break_seconds);
      setCompletedPomodoros(joinedSession.completed_pomodoros);
      setWorkMinutes(
        Math.max(1, Math.round(joinedSession.pomodoro_work_seconds / 60))
      );
      setBreakMinutes(
        Math.max(1, Math.round(joinedSession.pomodoro_break_seconds / 60))
      );
      setNotes(joinedSession.notes ?? "");
      setPhaseSeconds(0);
      setPhase("work");
      setRunning(false);
      setMessage(
        "انضمّيت للغرفة بنجاح. اضغط «استئناف الجلسة» باش يبدأ وقتك الشخصي."
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRoomBusy(false);
    }
  };

  const shareRoom = async () => {
    if (!room) return;

    const link = `${window.location.origin}/study-sessions?invite=${encodeURIComponent(room.invite_code)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "MARIS STUDY ROOM",
          text: `انضمّ للمراجعة الجماعية في MARIS ACADEMY. كود الدعوة: ${room.invite_code}`,
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(link);
        setMessage("نسخنا رابط الغرفة. ابعثه لزملائك!");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(link);
        setMessage("نسخنا رابط الغرفة. ابعثه لزملائك!");
      } catch {
        setErrorMessage(
          "ما قدرناش ننسخو الرابط تلقائيًا. استعمل كود الدعوة الظاهر في الغرفة."
        );
      }
    }
  };

  const closeRoom = async () => {
    if (!room) return;

    const confirmed = window.confirm(
      "هل تريد إغلاق الغرفة؟ لن يتمكن الطلبة من الانضمام إليها بعد الإغلاق."
    );

    if (!confirmed) return;

    setRoomBusy(true);
    setErrorMessage("");

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("تعذّر الاتصال بقاعدة البيانات.");

      const { data, error } = await supabase.rpc("close_study_room", {
        p_room_id: room.id,
      });

      if (error) throw error;
      if (data !== true) {
        throw new Error("ما قدرناش نغلقو الغرفة. تأكد أنك صاحبها.");
      }

      setRoom({ ...room, status: "closed" });
      setMessage("تم إغلاق الغرفة. تقدر تكمل حفظ جلستك الشخصية.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRoomBusy(false);
    }
  };

  const phaseTarget =
    sessionType === "pomodoro"
      ? (phase === "work" ? workMinutes : breakMinutes) * 60
      : 0;

  const phaseRemaining = Math.max(0, phaseTarget - phaseSeconds);

  const progress =
    phaseTarget > 0
      ? Math.min(100, (phaseSeconds / phaseTarget) * 100)
      : 0;

  const waterLevel =
    phaseTarget > 0
      ? Math.max(0, Math.min(1, phaseRemaining / phaseTarget))
      : 0;

  const waterY = 278 - waterLevel * 256;
  const ringCircumference = 2 * Math.PI * 133;

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[70vh] items-center justify-center bg-[#020617] px-4 text-cyan-100"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-300" />
          <p className="font-bold">نحضّرو فضاء الدراسة...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-x-clip text-white"
      style={{ background: theme.background }}
    >
      <audio ref={audioRef} preload="none" />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 top-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-[100px]" />
        <div className="absolute -left-32 bottom-10 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:36px_36px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-cyan-200/70 transition hover:text-cyan-100"
            >
              <span>→</span>
              الرجوع للرئيسية
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-2xl shadow-lg shadow-cyan-950/20 sm:h-12 sm:w-12">
                🐋
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.2em] text-cyan-300 sm:text-xs">
                  MARIS ACADEMY ²⁰²⁷
                </p>
                <h1 className="mt-1 break-words text-xl font-black sm:text-3xl">
                  MARIS STUDY ROOM
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
              مساحتك الخاصة للتركيز، تنظيم الوقت، ومراجعة جماعية مع زملائك.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings((value) => !value)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:w-auto sm:px-5"
          >
            ⚙️ {showSettings ? "إخفاء التخصيص" : "تخصيص أجواء الدراسة"}
          </button>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 break-words rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-7 text-rose-100"
          >
            {errorMessage}
          </div>
        )}

        {message && (
          <div
            aria-live="polite"
            className="mb-5 break-words rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4 text-sm leading-7 text-cyan-100"
          >
            {message}
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl sm:p-5">
            <p className="text-sm text-white/50">دراسة اليوم</p>
            <p className="mt-3 text-2xl font-black" style={{ color: theme.accent }}>
              {formatHours(todaySeconds + studySeconds)}
            </p>
            <p className="mt-2 text-xs text-white/35">الوقت المسجّل في حسابك</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl sm:p-5">
            <p className="text-sm text-white/50">إجمالي الدراسة</p>
            <p className="mt-3 text-2xl font-black">
              {formatHours(totalSeconds + studySeconds)}
            </p>
            <p className="mt-2 text-xs text-white/35">مجموع الجلسات المحمّلة</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl sm:p-5">
            <p className="text-sm text-white/50">فترات Pomodoro</p>
            <p className="mt-3 text-2xl font-black" style={{ color: theme.accent }}>
              {completedPomodoros}
            </p>
            <p className="mt-2 text-xs text-white/35">الفترات المكتملة في جلستك</p>
          </div>
        </section>

        {/* الغرف الجماعية */}
        <section className="mb-6 rounded-3xl border border-cyan-300/15 bg-[#020617]/65 p-4 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-widest text-cyan-300">
                MARIS GROUP STUDY
              </p>
              <h2 className="mt-2 text-xl font-black">المراجعة مع الأصدقاء</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                كل طالب عنده مؤقّت وحساب وقت مستقل، حتى داخل نفس الغرفة.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowRooms((value) => !value)}
              className="min-h-11 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100"
            >
              {showRooms ? "إخفاء الغرف" : "فتح الغرف الجماعية"}
            </button>
          </div>

          {room && (
            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-white/50">الغرفة الحالية</p>
                  <p className="mt-1 text-lg font-black">
                    {room.status === "active" ? "🌊 غرفة نشطة" : "🔒 غرفة مغلقة"}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white/70">
                  {room.status === "active" ? "متاحة للانضمام" : "الانضمام مغلق"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs text-white/45">كود الدعوة</p>
                  <p dir="ltr" className="mt-1 break-all text-xl font-black tracking-widest text-cyan-200">
                    {room.invite_code}
                  </p>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs text-white/45">وقت دراستك الشخصي</p>
                  <p className="mt-1 text-xl font-black">
                    {formatHours(studySeconds)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void shareRoom()}
                  className="min-h-11 flex-1 rounded-xl px-4 py-3 text-sm font-black text-slate-950"
                  style={{ backgroundColor: theme.accent }}
                >
                  ↗ مشاركة رابط الدعوة
                </button>

                {room.host_user_id === userId && room.status === "active" && (
                  <button
                    type="button"
                    disabled={roomBusy}
                    onClick={() => void closeRoom()}
                    className="min-h-11 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-100 disabled:opacity-50"
                  >
                    {roomBusy ? "جارٍ التنفيذ..." : "إغلاق الغرفة"}
                  </button>
                )}
              </div>

              <p className="mt-3 text-xs leading-6 text-white/45">
                إغلاق الغرفة يمنع الانضمام الجديد؛ لا يغلق جلسات الأعضاء الشخصية ولا يدمج أوقاتهم.
              </p>
            </div>
          )}

          {showRooms && (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <span className="text-2xl">✨</span>
                <h3 className="mt-2 font-black">أنشئ غرفة جديدة</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  أنشئ غرفة وشارك رابطها مع أصدقائك. يتم إنشاء جلسة شخصية لك تلقائيًا.
                </p>
                <button
                  type="button"
                  disabled={roomBusy || Boolean(session)}
                  onClick={() => void createRoom()}
                  className="mt-4 min-h-11 w-full rounded-xl px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: theme.accent }}
                >
                  {roomBusy ? "جارٍ إنشاء الغرفة..." : "＋ إنشاء غرفة"}
                </button>
                {session && (
                  <p className="mt-2 text-xs leading-5 text-amber-200/70">
                    أنهِ جلستك الحالية أولًا لإنشاء غرفة أخرى.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <span className="text-2xl">🤝</span>
                <h3 className="mt-2 font-black">انضم لغرفة صديقك</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  الصق كود الدعوة أو افتح رابط الغرفة الذي أرسله لك صديقك.
                </p>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs text-white/50">كود الدعوة</span>
                  <input
                    value={inviteCodeInput}
                    onChange={(event) =>
                      setInviteCodeInput(normalizeInviteCode(event.target.value))
                    }
                    placeholder="مثال: A1B2C3D4"
                    dir="ltr"
                    maxLength={32}
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-[#071426] px-4 py-3 text-center font-mono font-black tracking-widest text-white outline-none focus:border-cyan-300/50"
                  />
                </label>
                <button
                  type="button"
                  disabled={roomBusy || Boolean(session)}
                  onClick={() => void joinRoom()}
                  className="mt-3 min-h-11 w-full rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {roomBusy ? "جارٍ الانضمام..." : "انضم للغرفة"}
                </button>
                {session && (
                  <p className="mt-2 text-xs leading-5 text-amber-200/70">
                    أنهِ جلستك الحالية قبل الانضمام لغرفة أخرى.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ترتيب الطلبة المستقل عن XP */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-[#020617]/65 p-4 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-widest text-cyan-300">
                STUDY LEADERBOARD
              </p>
              <h2 className="mt-2 text-xl font-black">🏆 ترتيب الطلبة في الدراسة</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                الترتيب حسب وقت الدراسة المسجّل، ثم الجلسات المكتملة ودورات Pomodoro؛ مستقل عن XP.
              </p>
            </div>
            <button
              type="button"
              disabled={leaderboardLoading}
              onClick={() => void loadLeaderboard()}
              className="min-h-10 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50"
            >
              {leaderboardLoading ? "جارٍ التحديث..." : "↻ تحديث"}
            </button>
          </div>

          {leaderboard.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm leading-6 text-white/45">
              {leaderboardLoading
                ? "جارٍ تحميل الترتيب..."
                : "ما كاينش ترتيب متاح حاليًا. أكمل جلساتك الدراسية باش يظهر ترتيب الطلبة."}
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[520px] text-right text-sm">
                <thead className="bg-white/[0.05] text-xs text-white/50">
                  <tr>
                    <th className="px-3 py-3">الرتبة</th>
                    <th className="px-3 py-3">الطالب</th>
                    <th className="px-3 py-3">وقت الدراسة</th>
                    <th className="px-3 py-3">الجلسات</th>
                    <th className="px-3 py-3">Pomodoro</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.user_id}
                      className={`border-t border-white/[0.07] ${
                        entry.user_id === userId ? "bg-cyan-300/[0.07]" : ""
                      }`}
                    >
                      <td className="px-3 py-3 font-black text-cyan-200">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-bold">
                          {entry.first_name} {entry.last_name}
                          {entry.user_id === userId ? " (أنت)" : ""}
                        </span>
                        {entry.stream && (
                          <span className="mt-1 block text-xs text-white/40">
                            {entry.stream}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-black" style={{ color: theme.accent }}>
                        {formatHours(Number(entry.total_study_seconds))}
                      </td>
                      <td className="px-3 py-3 text-white/75">
                        {Number(entry.completed_sessions)}
                      </td>
                      <td className="px-3 py-3 text-white/75">
                        {Number(entry.completed_pomodoros)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showSettings && (
          <section className="mb-6 rounded-3xl border border-white/10 bg-[#020617]/60 p-4 backdrop-blur-xl sm:p-7">
            <div className="mb-5">
              <p className="text-xs font-black tracking-widest text-cyan-300">
                YOUR ENVIRONMENT
              </p>
              <h2 className="mt-2 text-xl font-black">اختار الأجواء تاعك</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={themeId === item.id}
                  onClick={() => setThemeId(item.id)}
                  className={`min-w-0 rounded-2xl border p-3 text-right transition ${
                    themeId === item.id
                      ? "border-cyan-300 ring-2 ring-cyan-300/20"
                      : "border-white/10 hover:border-white/30"
                  }`}
                  style={{ background: item.background }}
                >
                  <span className="mb-4 block h-10 rounded-xl border border-white/10 bg-white/5 sm:h-12" />
                  <span className="block break-words text-sm font-black">{item.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-white/55">
                    {item.description}
                  </span>
                  {themeId === item.id && (
                    <span className="mt-2 block text-xs font-bold text-cyan-200">✓ مختار</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-7">
              <h3 className="mb-2 font-black">الأصوات المريحة</h3>
              <p className="mb-4 text-xs leading-6 text-white/45">
                اختار صوتًا طبيعيًا. الصوت يشتغل أثناء الجلسة ويتوقف عند الإيقاف المؤقت.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SOUNDS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={sound === item.id}
                    onClick={() => {
                      setSound(item.id);
                      setErrorMessage("");
                      setMessage(
                        item.id === "off"
                          ? "تم إيقاف الصوت."
                          : running
                            ? "تم تغيير الصوت."
                            : "تم اختيار الصوت. يبدأ مع جلسة الدراسة."
                      );
                    }}
                    className={`min-h-[100px] min-w-0 rounded-2xl border px-3 py-4 text-sm font-bold transition ${
                      sound === item.id
                        ? "border-cyan-300 bg-cyan-300/10 text-cyan-100 ring-1 ring-cyan-300/20"
                        : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="mb-2 block text-2xl">{item.icon}</span>
                    <span className="block break-words leading-5">{item.label}</span>
                    {sound === item.id && (
                      <span className="mt-2 block text-[11px] text-cyan-200">✓ مختار</span>
                    )}
                  </button>
                ))}
              </div>

              {sound !== "off" && (
                <div className="mt-4 rounded-2xl bg-white/[0.04] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white/75">🎚️ مستوى الصوت</span>
                    <span className="text-sm font-black tabular-nums text-cyan-200">{volume}%</span>
                  </div>
                  <input
                    aria-label="مستوى الصوت"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                    className="block min-h-8 w-full cursor-pointer accent-cyan-300"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-white/35">
                    <span>هادئ</span>
                    <span>مرتفع</span>
                  </div>
                  {volume === 0 && (
                    <p className="mt-3 text-xs text-amber-200/80">الصوت مكتوم. ارفع المستوى لسماعه.</p>
                  )}
                  {!running && (
                    <p className="mt-3 text-xs leading-6 text-white/40">
                      اضغط «ابدأ الدراسة» باش يبدأ الصوت المختار.
                    </p>
                  )}
                </div>
              )}

              <p className="mt-3 text-xs leading-6 text-white/40">
                الملفات الصوتية تُحمّل من مجلد sounds داخل public.
              </p>
            </div>
          </section>
        )}

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
          <section className="min-w-0 rounded-[1.5rem] border border-white/10 bg-[#020617]/50 p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:rounded-[2rem] sm:p-8 lg:p-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black tracking-[0.2em] text-cyan-300/80">
                  FOCUS SESSION
                </p>
                <h2 className="mt-2 text-xl font-black sm:text-2xl">
                  وقتك، تركيزك، إنجازك
                </h2>
              </div>
              <span className="self-start rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/60">
                {running ? "● الجلسة جارية" : session ? "الجلسة متوقفة" : "جاهز للبدء"}
              </span>
            </div>

            {room && (
              <div className="mb-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3 text-sm leading-6 text-cyan-100/80">
                🌊 راك في غرفة جماعية. الوقت المسجّل هنا يخص حسابك وحدك.
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <button
                type="button"
                disabled={Boolean(session)}
                onClick={() => {
                  setSessionType("free");
                  setPhase("work");
                  setPhaseSeconds(0);
                }}
                className={`min-w-0 rounded-2xl border p-4 text-right transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  sessionType === "free"
                    ? "border-cyan-300/60 bg-cyan-300/10"
                    : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
                }`}
              >
                <span className="block text-2xl">⏱️</span>
                <span className="mt-2 block font-black">الوقت الحر</span>
                <span className="mt-1 block text-xs leading-5 text-white/45">
                  ادرس على راحتك بلا حدّ زمني
                </span>
              </button>

              <button
                type="button"
                disabled={Boolean(session)}
                onClick={() => {
                  setSessionType("pomodoro");
                  setPhase("work");
                  setPhaseSeconds(0);
                }}
                className={`min-w-0 rounded-2xl border p-4 text-right transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  sessionType === "pomodoro"
                    ? "border-cyan-300/60 bg-cyan-300/10"
                    : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
                }`}
              >
                <span className="block text-2xl">🍅</span>
                <span className="mt-2 block font-black">Pomodoro</span>
                <span className="mt-1 block text-xs leading-5 text-white/45">
                  تركيز متبوع باستراحة
                </span>
              </button>
            </div>

            {sessionType === "pomodoro" && !session && (
              <div className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                <label className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <span className="mb-2 block text-xs leading-5 text-white/55">
                    مدة التركيز بالدقائق
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={workMinutes}
                    onChange={(event) =>
                      setWorkMinutes(Math.min(120, Math.max(1, Number(event.target.value) || 1)))
                    }
                    className="w-full min-w-0 bg-transparent text-xl font-black outline-none"
                  />
                </label>
                <label className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <span className="mb-2 block text-xs leading-5 text-white/55">
                    مدة الاستراحة بالدقائق
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={breakMinutes}
                    onChange={(event) =>
                      setBreakMinutes(Math.min(60, Math.max(1, Number(event.target.value) || 1)))
                    }
                    className="w-full min-w-0 bg-transparent text-xl font-black outline-none"
                  />
                </label>
              </div>
            )}

            <label className="mb-6 block">
              <span className="mb-2 block text-sm font-bold text-white/70">المادة الدراسية</span>
              <select
                value={subjectId}
                disabled={Boolean(session)}
                onChange={(event) => setSubjectId(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-white/10 bg-[#0b1830] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50 disabled:opacity-60"
              >
                <option value="">اختار المادة (اختياري)</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
              {subjects.length === 0 && (
                <span className="mt-2 block text-xs leading-5 text-white/40">
                  ما لقيناش مواد متاحة لشعبتك حاليًا، تقدر تبدأ بلا مادة.
                </span>
              )}
            </label>

            {/* MARIS LIQUID TIMER */}
            <div className="relative mb-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#020b18]/75 px-3 py-7 text-center shadow-2xl shadow-black/20 sm:rounded-[2rem] sm:px-6 sm:py-9">
              <div
                className="pointer-events-none absolute left-1/2 top-0 h-44 w-64 -translate-x-1/2 rounded-full opacity-20 blur-[75px]"
                style={{ backgroundColor: theme.accent }}
              />

              <p className="relative text-[10px] font-black tracking-[0.2em] text-white/45 sm:text-xs">
                {sessionType === "free"
                  ? "MARIS • OPEN STUDY"
                  : phase === "work"
                    ? "MARIS • FOCUS MODE"
                    : "MARIS • RECOVERY MODE"}
              </p>

              <h3 className="relative mt-2 text-lg font-black sm:text-xl">
                {sessionType === "free"
                  ? "وقتك مفتوح"
                  : phase === "work"
                    ? "كل ثانية تقرّبك لهدفك"
                    : "استرجع طاقتك"}
              </h3>

              <div
                className="relative mx-auto my-7 aspect-square w-full max-w-[280px] sm:my-8 sm:max-w-[320px]"
                role="img"
                aria-label={
                  sessionType === "pomodoro"
                    ? `الوقت المتبقي ${formatTime(phaseRemaining)}`
                    : `الوقت الإجمالي للدراسة ${formatTime(studySeconds)}`
                }
              >
                <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <defs>
                    <clipPath id="maris-liquid-clip">
                      <circle cx="150" cy="150" r="128" />
                    </clipPath>
                    <linearGradient id="maris-liquid-gradient" x1="0" y1="0" x2="0.8" y2="1">
                      <stop offset="0%" stopColor="#a5f3fc" />
                      <stop offset="40%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                    <linearGradient id="maris-liquid-shade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity=".12" />
                      <stop offset="100%" stopColor="#020617" stopOpacity=".25" />
                    </linearGradient>
                  </defs>

                  <circle cx="150" cy="150" r="140" fill="none" stroke="white" strokeOpacity=".045" />
                  <circle cx="150" cy="150" r="133" fill="#061525" stroke="white" strokeOpacity=".12" />

                  {sessionType === "pomodoro" && (
                    <g clipPath="url(#maris-liquid-clip)">
                      <rect x="0" y={waterY} width="300" height={Math.max(0, 300 - waterY)} fill="#22d3ee" opacity=".18" />
                      <path
                        d={`M -300 ${waterY} Q -225 ${waterY - 9} -150 ${waterY} T 0 ${waterY} T 150 ${waterY} T 300 ${waterY} T 450 ${waterY} T 600 ${waterY} L 600 300 L -300 300 Z`}
                        fill="url(#maris-liquid-gradient)"
                        className={running ? "maris-wave-primary" : ""}
                      />
                      <path
                        d={`M -300 ${waterY + 7} Q -225 ${waterY - 1} -150 ${waterY + 7} T 0 ${waterY + 7} T 150 ${waterY + 7} T 300 ${waterY + 7} T 450 ${waterY + 7} T 600 ${waterY + 7} L 600 300 L -300 300 Z`}
                        fill="#a5f3fc"
                        opacity=".22"
                        className={running ? "maris-wave-secondary" : ""}
                      />
                      <rect x="0" y={waterY} width="300" height={Math.max(0, 300 - waterY)} fill="url(#maris-liquid-shade)" />
                      {waterLevel > 0.12 && (
                        <>
                          <circle cx="76" cy="205" r="3" fill="#ecfeff" opacity=".6" />
                          <circle cx="205" cy="228" r="2" fill="#ecfeff" opacity=".7" />
                          <circle cx="98" cy="250" r="2" fill="#ecfeff" opacity=".5" />
                        </>
                      )}
                    </g>
                  )}

                  <circle cx="150" cy="150" r="128" fill="none" stroke="white" strokeOpacity=".14" />
                  {sessionType === "pomodoro" && (
                    <circle
                      cx="150"
                      cy="150"
                      r="133"
                      fill="none"
                      stroke={theme.accent}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringCircumference * (1 - waterLevel)}
                      transform="rotate(-90 150 150)"
                      style={{
                        transition: "stroke-dashoffset 0.8s linear",
                        filter: `drop-shadow(0 0 5px ${theme.accent}70)`,
                      }}
                    />
                  )}
                  {sessionType === "free" && (
                    <circle cx="150" cy="150" r="133" fill="none" stroke={theme.accent} strokeOpacity=".65" strokeWidth="2" />
                  )}
                </svg>

                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-2">
                  <span className="mb-3 rounded-full border border-white/15 bg-[#061525]/80 px-3 py-1.5 text-[10px] font-black text-white/90 shadow-lg backdrop-blur-md sm:text-xs">
                    {sessionType === "free" ? "⏱️ الوقت الحر" : phase === "work" ? "🔥 تركيز" : "☕ استراحة"}
                  </span>
                  <div
                    className="whitespace-nowrap font-mono text-[clamp(1.8rem,8.5vw,3.5rem)] font-black tabular-nums tracking-[-0.06em] text-white"
                    dir="ltr"
                    style={{ textShadow: "0 3px 24px rgba(0,0,0,.8)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {sessionType === "free" ? formatTime(studySeconds) : formatTime(phaseRemaining)}
                  </div>
                  <span className="mt-3 text-[10px] font-bold text-white/90 sm:text-xs">
                    {sessionType === "free" ? "الوقت يزيد مع استمرار الدراسة" : `باقي ${Math.round(waterLevel * 100)}٪ من الفترة`}
                  </span>
                </div>
              </div>

              <p className="relative text-sm font-bold text-white/75">
                {sessionType === "free"
                  ? "كل دقيقة تقراها تقرّبك لهدفك 💙"
                  : phase === "work"
                    ? "ركّز على مهمتك، وخلي الباقي علينا."
                    : "استراحة قصيرة تساعدك ترجع بنشاط."}
              </p>

              {sessionType === "pomodoro" && (
                <div className="relative mx-auto mt-5 max-w-sm">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-white/50">تقدّم الفترة</span>
                    <span className="font-black tabular-nums" style={{ color: theme.accent }}>
                      {Math.round(progress)}٪
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-label="نسبة الوقت المنقضي"
                  >
                    <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${progress}%`, backgroundColor: theme.accent }} />
                  </div>
                </div>
              )}

              <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/65">
                <span className="rounded-full border border-white/10 bg-[#061525]/80 px-3 py-2">📚 دراسة: {formatTime(studySeconds)}</span>
                {sessionType === "pomodoro" && (
                  <>
                    <span className="rounded-full border border-white/10 bg-[#061525]/80 px-3 py-2">☕ استراحة: {formatTime(breakSeconds)}</span>
                    <span className="rounded-full border border-white/10 bg-[#061525]/80 px-3 py-2">🍅 {completedPomodoros} مكتملة</span>
                  </>
                )}
              </div>

              <style jsx>{`
                .maris-wave-primary {
                  animation: maris-wave-motion 7s linear infinite;
                  will-change: transform;
                }
                .maris-wave-secondary {
                  animation: maris-wave-motion 10s linear infinite reverse;
                  will-change: transform;
                }
                @keyframes maris-wave-motion {
                  from { transform: translateX(0); }
                  to { transform: translateX(-150px); }
                }
                @media (prefers-reduced-motion: reduce) {
                  .maris-wave-primary, .maris-wave-secondary {
                    animation: none !important;
                  }
                }
              `}</style>
            </div>

            <label className="mb-6 block">
              <span className="mb-2 block text-sm font-bold text-white/70">هدف الجلسة أو ملاحظاتك</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="مثلاً: مراجعة درس الاشتقاق وحل 5 تمارين..."
                className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm leading-7 outline-none transition placeholder:text-white/25 focus:border-cyan-300/50"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!running ? (
                <button
                  type="button"
                  onClick={() => void beginSession()}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black text-slate-950 shadow-xl shadow-cyan-950/20 transition hover:brightness-110 active:scale-[0.99]"
                  style={{ backgroundColor: theme.accent }}
                >
                  ▶ {session ? "استئناف الجلسة" : "ابدأ الدراسة"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void pauseSession()}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-4 font-black text-amber-100 transition hover:bg-amber-300/15"
                >
                  Ⅱ إيقاف مؤقت
                </button>
              )}

              <button
                type="button"
                disabled={!session}
                onClick={() => void finishSession()}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 font-black text-white transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ✓ إنهاء وحفظ الجلسة
              </button>
            </div>

            {session && (
              <div className="mt-4 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center min-[420px]:justify-between">
                <span className="text-xs leading-5 text-white/40">
                  {saving ? "جارٍ حفظ بياناتك..." : "الحفظ التلقائي كل 15 ثانية"}
                </span>
                <button
                  type="button"
                  onClick={() => void cancelSession()}
                  className="min-h-10 self-start text-xs font-bold text-rose-300/70 transition hover:text-rose-200"
                >
                  إلغاء الجلسة
                </button>
              </div>
            )}

            {sessionType === "pomodoro" && running && (
              <button
                type="button"
                onClick={resetPhase}
                className="mt-4 min-h-11 w-full rounded-xl border border-white/5 px-4 py-3 text-xs font-bold text-white/45 transition hover:bg-white/5 hover:text-white/80"
              >
                إعادة ضبط الفترة الحالية
              </button>
            )}
          </section>

          <aside className="min-w-0 space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#020617]/50 p-4 backdrop-blur-xl sm:p-5">
              <p className="text-xs font-black tracking-widest text-cyan-300">STUDY ROUTINE</p>
              <h2 className="mt-2 text-lg font-black">روتين دراسة فعّال</h2>

              <div className="mt-5 space-y-4">
                {[
                  ["01", "حدّد هدفك", "اعرف واش راك حاب تكمل قبل ما تبدأ."],
                  ["02", "ابعد المشتتات", "خلي الهاتف والإشعارات بعيد عليك."],
                  ["03", "ركّز على مهمة", "مادة واحدة وهدف واضح في كل فترة."],
                  ["04", "راجع إنجازك", "شوف واش كملت وخطّط للجلسة الجاية."],
                ].map(([number, title, description]) => (
                  <div key={number} className="flex min-w-0 gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] text-xs font-black text-cyan-200">
                      {number}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black">{title}</h3>
                      <p className="mt-1 text-xs leading-6 text-white/45">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#020617]/50 p-4 backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black tracking-widest text-cyan-300">RECENT SESSIONS</p>
                  <h2 className="mt-2 text-lg font-black">جلساتك الأخيرة</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistory((value) => !value)}
                  className="min-h-10 shrink-0 text-xs font-bold text-cyan-200 hover:text-cyan-100"
                >
                  {showHistory ? "إخفاء" : "عرض الكل"}
                </button>
              </div>

              {history.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-center">
                  <span className="text-2xl">🌱</span>
                  <p className="mt-2 text-sm font-bold">بداية جديدة</p>
                  <p className="mt-1 text-xs leading-6 text-white/40">
                    كي تكمل أول جلسة، تلقاها هنا.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {(showHistory ? history : history.slice(0, 3)).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold">
                          {item.session_type === "pomodoro" ? "🍅 Pomodoro" : "⏱️ وقت حر"}
                        </span>
                        <span className="shrink-0 text-sm font-black" style={{ color: theme.accent }}>
                          {formatHours(item.study_seconds)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-white/40">
                        {new Date(item.started_at).toLocaleDateString("ar-DZ")}
                        {" · "}
                        {item.completed_pomodoros} فترات مكتملة
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
              <p className="text-2xl">💙</p>
              <p className="mt-3 text-sm font-black">خطوة صغيرة كل يوم</p>
              <p className="mt-2 text-xs leading-7 text-white/50">
                ماشي المهم تقرا ساعات طويلة مرة وحدة، المهم تبني عادة ثابتة وتستمر عليها.
              </p>
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] pt-6 text-center text-xs leading-6 text-white/35 sm:flex-row sm:text-right">
          <span>🐋 MARIS ACADEMY ²⁰²⁷</span>
          <span>
            {saving ? "جارٍ الحفظ..." : "جلساتك مرتبطة بحسابك ومحفوظة في Supabase"}
          </span>
        </footer>
      </div>
    </main>
  );
}
