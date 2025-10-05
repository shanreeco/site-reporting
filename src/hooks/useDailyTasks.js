import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const TASK_STATUSES = ["ongoing", "completed", "rejected"];

const TODAY = () => new Date().toISOString().slice(0, 10);

export function useDailyTasks(selectedDate) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!selectedDate) return;
      if (!silent) setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("daily_tasks")
        .select(
          "*, updated_by_profile:profiles!daily_tasks_updated_by_fkey(full_name,email)"
        )
        .eq("task_date", selectedDate)
        .order("created_at", { ascending: true });
      setTasks(data || []);
      setError(fetchError?.message || "");
      setLoading(false);
    },
    [selectedDate]
  );

  const ensureCarryOver = useCallback(async () => {
    if (!selectedDate) return;
    const today = TODAY();
    if (selectedDate !== today) return;

    const { data: previousDay, error: prevError } = await supabase
      .from("daily_tasks")
      .select("task_date")
      .lt("task_date", selectedDate)
      .order("task_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevError) {
      setError(prevError.message);
      return;
    }

    const previousDate = previousDay?.task_date;
    if (!previousDate) return;

    const { data: previousTasks, error: previousTasksError } = await supabase
      .from("daily_tasks")
      .select("id,title,status,carry_over_from,user_id")
      .eq("task_date", previousDate);

    if (previousTasksError) {
      setError(previousTasksError.message);
      return;
    }

    if (!previousTasks?.length) return;

    const incomplete = previousTasks.filter((task) => task.status !== "completed");
    if (!incomplete.length) return;

    const carryIds = incomplete.map((task) => task.carry_over_from || task.id);

    if (!carryIds.length) return;

    const { data: todaysTasks, error: todaysError } = await supabase
      .from("daily_tasks")
      .select("carry_over_from")
      .eq("task_date", selectedDate)
      .in("carry_over_from", carryIds);

    if (todaysError) {
      setError(todaysError.message);
      return;
    }

    const existingCarry = new Set((todaysTasks || []).map((task) => task.carry_over_from).filter(Boolean));

    const rowsToInsert = incomplete
      .filter((task) => !existingCarry.has(task.carry_over_from || task.id))
      .map((task) => ({
        task_date: selectedDate,
        title: task.title,
        status: "ongoing",
        verified: false,
        verified_by: null,
        verified_at: null,
        remarks: null,
        carry_over_from: task.carry_over_from || task.id,
        user_id: task.user_id || null,
        updated_by: null,
      }));

    if (!rowsToInsert.length) return;

    const { error: insertError } = await supabase.from("daily_tasks").insert(rowsToInsert);
    if (insertError) {
      setError(insertError.message);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    let ignore = false;

    const initialise = async () => {
      await ensureCarryOver();
      if (!ignore) {
        await refresh();
      }
    };

    initialise();

    const channel = supabase
      .channel(`daily_tasks-${selectedDate}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_tasks" },
        (payload) => {
          if (ignore) return;
          const changedDate = payload.new?.task_date || payload.old?.task_date;
          if (!changedDate || changedDate === selectedDate) {
            refresh({ silent: true });
          }
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [selectedDate, ensureCarryOver, refresh]);

  const addTask = useCallback(
    async (title) => {
      if (!selectedDate) return;
      const trimmed = title.trim();
      if (!trimmed) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      const { error: insertError } = await supabase.from("daily_tasks").insert({
        title: trimmed,
        task_date: selectedDate,
        status: "ongoing",
        user_id: userId,
        updated_by: userId || null,
      });
      if (insertError) {
        alert(insertError.message);
      }
    },
    [selectedDate]
  );

  const updateTask = useCallback(async (id, changes) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const payload = {
      ...changes,
      updated_at: new Date().toISOString(),
      ...(userId ? { updated_by: userId } : {}),
    };
    const { error: updateError } = await supabase.from("daily_tasks").update(payload).eq("id", id);
    if (updateError) {
      alert(updateError.message);
    }
  }, []);

  const verifyTask = useCallback(
    async (id, shouldVerify) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      if (shouldVerify) {
        await updateTask(id, {
          verified: true,
          verified_by: userId,
          verified_at: new Date().toISOString(),
        });
      } else {
        await updateTask(id, {
          verified: false,
          verified_by: null,
          verified_at: null,
        });
      }
    },
    [updateTask]
  );

  const deleteTask = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from("daily_tasks").delete().eq("id", id);
    if (deleteError) {
      alert(deleteError.message);
    }
  }, []);

  return { tasks, loading, error, refresh, addTask, updateTask, verifyTask, deleteTask };
}
