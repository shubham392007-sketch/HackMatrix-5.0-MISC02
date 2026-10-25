"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Users,
  Clock,
  RotateCw,
  Mail,
  CheckCircle2,
  ChevronRight,
  Send,
} from "lucide-react";
import { getRecruiterInbox } from "@/lib/recruiterApi";

export default function RecruiterInboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadInbox = async () => {
    setLoading(true);
    try {
      const res = await getRecruiterInbox();
      setMessages(res.messages || []);
      setTotal(res.total_messages || 0);
      setUnreadCount(res.unread_count || 0);
    } catch (err: any) {
      console.error("Could not load recruiter inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-16">
      {/* ── CLEAN PAGE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1C1C1C]/15">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
              Employer Inbox
            </h1>
            {unreadCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F6BB84] text-[#1C1C1C] border border-[#1C1C1C] shadow-[1px_1px_0_0_#1C1C1C]">
                {unreadCount} Unread
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DFE968] text-[#1C1C1C] border border-[#1C1C1C] shadow-[1px_1px_0_0_#1C1C1C]">
                All Caught Up
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Two-way message threads with candidates who have shared their Skill Passport.
          </p>
        </div>

        <div className="text-xs font-mono text-stone-600 bg-[#FAF8F5] px-3.5 py-1.5 rounded-full border-[1.5px] border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C] w-fit">
          Total Conversations: <strong className="text-[#1C1C1C]">{total}</strong>
        </div>
      </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-stone-500 bg-[#FAF8F5] rounded-2xl border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C]">
            <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-400" />
            Loading message threads...
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((thread) => (
              <div
                key={thread.message_id}
                className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] hover:shadow-[4px_4px_0_0_#1C1C1C] transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#1C1C1C]">
                      {thread.candidate_name}
                    </span>
                    <span className="text-xs text-stone-500">
                      ({thread.candidate_email})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(thread.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Message Details */}
                <div className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 space-y-1.5 text-xs">
                  <p className="font-bold text-[#1C1C1C]">
                    Subject: {thread.subject}
                  </p>
                  <p className="text-stone-700 leading-relaxed font-sans line-clamp-3">
                    {thread.message_body}
                  </p>
                </div>

                {/* Candidate Reply */}
                {thread.reply_body ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-emerald-950">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Candidate Reply Received:
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700">
                        {thread.replied_at ? new Date(thread.replied_at).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="text-emerald-900 leading-relaxed">{thread.reply_body}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-500 italic pl-1">
                    Awaiting candidate response.
                  </p>
                )}

                {/* Action Link */}
                {thread.invitation_id && (
                  <div className="flex justify-end pt-2 border-t border-stone-200">
                    <Link
                      href={`/recruiter/candidates/${thread.invitation_id}`}
                      className="pill-btn pill-btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                    >
                      <span>View Candidate Review & Reply &rarr;</span>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center bg-[#FAF8F5] rounded-2xl border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
            <MessageSquare className="w-10 h-10 text-stone-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#1C1C1C]">No Messages in Inbox</h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                When you message candidates reviewing their Skill Passport or receive replies, they will appear in this unified inbox.
              </p>
            </div>
            <Link
              href="/recruiter/candidates"
              className="pill-btn pill-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs shadow-[2px_2px_0_0_#1C1C1C]"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Browse Candidate Pipeline</span>
            </Link>
          </div>
        )}
    </div>
  );
}
