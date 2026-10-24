"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { sharingApi } from "@/lib/sharingApi";
import { supabase } from "@/lib/supabase/client";
import { useEvidence } from "@/context/EvidenceContext";
import { RecruiterMessage } from "@/types/sharing";
import {
  Mail,
  Building2,
  Briefcase,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Inbox,
  ArrowLeft,
  Share2,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";

export default function RecruiterMessagesPage() {
  const { currentUserId, notifications, markNotificationRead } = useEvidence();
  const [messages, setMessages] = useState<RecruiterMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<RecruiterMessage | null>(null);

  const fetchMessages = useCallback(async (isSilent: boolean = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      const data = await sharingApi.listMessages();
      setMessages(data);
      if (data.length > 0) {
        setSelectedMessage((prev) => {
          if (!prev) return data[0];
          const updatedSelected = data.find((m) => m.id === prev.id);
          return updatedSelected || data[0];
        });
      } else {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.warn("Could not load recruiter messages:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Live Supabase Realtime subscription for inbound recruiter messages
  useEffect(() => {
    if (!currentUserId) return;

    const channelName = `rt-msg-page-${currentUserId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recruiter_messages",
          filter: `recipient_user_id=eq.${currentUserId}`,
        },
        () => {
          fetchMessages(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchMessages]);

  const handleSelectMessage = async (msg: RecruiterMessage) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      try {
        await sharingApi.markMessageRead(msg.id, true);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m))
        );
        // Find matching notification in context and mark read
        const matchingNotif = notifications.find(
          (n) => n.entityId === msg.id || n.id === msg.id
        );
        if (matchingNotif) {
          markNotificationRead(matchingNotif.id);
        }
      } catch (err) {
        console.warn("Could not mark message read:", err);
      }
    }
  };

  const handleToggleReadStatus = async (msg: RecruiterMessage) => {
    const nextRead = !msg.isRead;
    try {
      await sharingApi.markMessageRead(msg.id, nextRead);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: nextRead } : m))
      );
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage({ ...msg, isRead: nextRead });
      }
      if (nextRead) {
        const matchingNotif = notifications.find(
          (n) => n.entityId === msg.id || n.id === msg.id
        );
        if (matchingNotif) {
          markNotificationRead(matchingNotif.id);
        }
      }
    } catch (err) {
      console.warn("Could not toggle message read status:", err);
    }
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="flex-1 flex flex-col font-sans">
      <AppTopBar
        title="Recruiter Messages & Inquiries"
        description="Review inbound messages from hiring managers and recruiters viewing your shared Skill Passport."
        badge="Domain 6 · Inbound Outreach"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/app/passport/sharing"
            className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Sharing Overview</span>
          </Link>
          <Link
            href="/app/passport/access"
            className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1"
          >
            <Share2 className="w-3 h-3" />
            <span>Manage Links</span>
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
        {/* Status Banner */}
        <div className="p-4 rounded-2xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between shadow-[2px_2px_0_0_#1C1C1C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1C1C1C]">
                Recruiter Communication Channel
              </h2>
              <p className="text-xs text-[#1C1C1C]/60">
                Messages submitted via your public recruiter links arrive here securely with live Supabase Realtime updates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMessages(true)}
              disabled={refreshing}
              className="p-1.5 rounded-full border border-[#1C1C1C]/20 hover:bg-[#1C1C1C]/5 text-[#1C1C1C] text-xs transition-colors"
              title="Refresh messages"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <span className="text-xs font-black px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C]">
              {unreadCount} Unread Inquiry{unreadCount === 1 ? "" : "ies"}
            </span>
          </div>
        </div>

        {/* Messages Split Pane */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[#1C1C1C]/50">
            Loading recruiter inquiries...
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border-[1.5px] border-[#1C1C1C] text-center space-y-4 shadow-[4px_4px_0_0_#1C1C1C]">
            <div className="w-14 h-14 rounded-2xl bg-[#FBF6DF] border border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#1C1C1C]">No Recruiter Messages Yet</h3>
              <p className="text-xs text-[#1C1C1C]/60 max-w-md mx-auto leading-relaxed">
                When recruiters or hiring managers view your shared Skill Passport and click "Contact Candidate", their messages and role details will appear here live.
              </p>
            </div>
            <Link
              href="/app/passport/share"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-xs font-black uppercase tracking-wider text-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C]"
            >
              <span>Create a Recruiter Share Link &rarr;</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
            {/* Left Column: Message List */}
            <div className="lg:col-span-5 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {messages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-4 rounded-xl border-[1.5px] transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-[#FFFFFF] border-[#1C1C1C] shadow-[3px_3px_0_0_#DFE968] ring-2 ring-[#DFE968]"
                        : "bg-[#FFFFFF]/80 border-[#1C1C1C]/15 hover:border-[#1C1C1C] hover:shadow-[2px_2px_0_0_#1C1C1C]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!msg.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#E0533C]" />
                        )}
                        <span className="text-xs font-black text-[#1C1C1C]">
                          {msg.senderName}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#1C1C1C]/50 font-mono">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#1C1C1C]/90 truncate">
                      {msg.subject || "Recruiter Inquiry"}
                    </div>

                    <p className="text-[11px] text-[#1C1C1C]/60 line-clamp-2 leading-relaxed">
                      {msg.messageBody}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[#1C1C1C]/50 pt-1 border-t border-[#1C1C1C]/10">
                      <span>{msg.company || "Independent Recruiter"}</span>
                      <span className="font-mono">{msg.shareLinkLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Message Detail View */}
            <div className="lg:col-span-7 bg-white rounded-2xl border-[1.5px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] p-6 sm:p-8 space-y-6">
              {selectedMessage ? (
                <div className="space-y-6">
                  {/* Sender Header */}
                  <div className="pb-5 border-b border-[#1C1C1C]/15 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xl font-black text-[#1C1C1C]">
                        {selectedMessage.subject || "Recruiter Inquiry"}
                      </h3>
                      <span className="text-xs font-mono text-[#1C1C1C]/50">
                        Received {new Date(selectedMessage.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-0.5">
                        <span className="text-[10px] text-stone-500 font-bold uppercase block">Sender:</span>
                        <span className="font-bold text-[#1C1C1C]">{selectedMessage.senderName}</span>
                        <a
                          href={`mailto:${selectedMessage.senderEmail}`}
                          className="text-emerald-700 hover:underline block text-[11px]"
                        >
                          {selectedMessage.senderEmail}
                        </a>
                      </div>

                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-0.5">
                        <span className="text-[10px] text-stone-500 font-bold uppercase block">Opportunity:</span>
                        <span className="font-bold text-[#1C1C1C]">{selectedMessage.company || "Company not specified"}</span>
                        <span className="text-[11px] text-stone-600 block">{selectedMessage.roleTitle || "Role not specified"}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#1C1C1C]/60 flex items-center gap-1.5 pt-1">
                      <Share2 className="w-3.5 h-3.5 text-[#1C1C1C]/40" />
                      <span>Origin Link: <strong>{selectedMessage.shareLinkLabel}</strong></span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                      Message Content:
                    </span>
                    <div className="p-5 rounded-xl bg-[#FBF6DF]/60 border border-[#1C1C1C]/15 text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedMessage.messageBody}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-4 border-t border-[#1C1C1C]/15 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified via SkillPassport Inbound Relay
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleReadStatus(selectedMessage)}
                        className="px-3.5 py-2 rounded-full border border-[#1C1C1C] text-xs font-bold text-[#1C1C1C] hover:bg-[#1C1C1C]/5 flex items-center gap-1"
                      >
                        {selectedMessage.isRead ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Mark Unread</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Mark Read</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`mailto:${selectedMessage.senderEmail}?subject=${encodeURIComponent(`Re: ${selectedMessage.subject || "Skill Passport Inquiry"}`)}`}
                        className="px-5 py-2.5 rounded-full bg-[#DFE968] hover:bg-[#d4df55] border-[1.5px] border-[#1C1C1C] text-xs font-black uppercase tracking-wider text-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Reply via Email</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-xs text-[#1C1C1C]/50">
                  Select a message from the list to view its contents.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
