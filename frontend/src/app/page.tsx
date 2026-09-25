"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Settings,
  Edit,
  MoreVertical,
  Send,
} from "lucide-react";

interface Conversation {
  id: number;
  type: string;
  name: string;
  avatar: string | null;
  last_message: string | null;
  last_message_time: string;
}

export default function Home() {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState("");

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  useEffect(() => {
    const user = localStorage.getItem("currentUser");

    if (!user) {
      window.location.href = "/login";
      return;
    }


    const userData = JSON.parse(user);

   
    const fetchConversations = async () => {
      try {
        console.log("USER DATA:", userData);
        console.log(
          "FETCH URL:",
          `http://localhost:8000/conversations/${userData.id}`
        );

        const response = await fetch(
          `http://localhost:8000/conversations/${userData.id}`
        );

        console.log("RESPONSE STATUS:", response.status);

        const data = await response.json();

        console.log("API DATA:", data);
        console.log("API DATA LENGTH:", data.length);

        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }

        setConversations(data);

      } catch (error) {
        console.error("FAILED:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);
  useEffect(() => {
    if (!selectedChat) return;

    const user = localStorage.getItem("currentUser");

    if (!user) return;

    const userData = JSON.parse(user);

    // First load existing messages
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/messages/${selectedChat}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await response.json();

        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    fetchMessages();

    // Connect WebSocket
    const ws = new WebSocket(
      `ws://localhost:8000/conversations/ws/${selectedChat}/${userData.id}`
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = async (event) => {
      //const data = JSON.parse(event.data);
      const data = JSON.parse(event.data);

      if (data.type === "presence") {
        setOnlineUsers((prev) => {
          if (data.status === "online") {
            if (prev.includes(data.user_id)) {
              return prev;
            }

            return [...prev, data.user_id];
          }

          return prev.filter((id) => id !== data.user_id);
        });

        return;
      }
      if (data.type === "typing") {
        setTypingUsers((prev) => {
          if (data.is_typing) {
            if (prev.includes(data.user_id)) {
              return prev;
            }

            return [...prev, data.user_id];
          }

          return prev.filter((id) => id !== data.user_id);
        });

        return;
      }
      if (data.type === "status_update") {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === data.message_id
              ? {
                ...message,
                status: data.status,
              }
              : message
          )
        );

        return;
      }

      if (data.type === "message") {
        const message = data;

        setMessages((prev) => [...prev, message]);

        const currentUser = JSON.parse(
          localStorage.getItem("currentUser") || "{}"
        );
        if (
          message.sender_id !== currentUser.id &&
          message.conversation_id !== selectedChat
        ) {
          setUnreadCounts((prev) => ({
            ...prev,
            [message.conversation_id]:
              (prev[message.conversation_id] || 0) + 1,
          }));
        }
        if (message.sender_id !== currentUser.id) {
          try {
            await fetch(
              `http://127.0.0.1:8000/messages/${message.id}/status`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  status: "delivered",
                }),
              }
            );
          } catch (error) {
            console.error(
              "Failed to update message status:",
              error
            );
          }
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setSocket(ws);

    return () => {
      ws.close();
      setSocket(null);
    };
  }, [selectedChat]);
  useEffect(() => {
    if (selectedChat === null || messages.length === 0) return;

    const markMessagesAsRead = async () => {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
      );

      const unreadMessages = messages.filter(
        (message) =>
          message.sender_id !== currentUser.id &&
          message.status !== "read"
      );

      for (const message of unreadMessages) {
        try {
          await fetch(
            `http://127.0.0.1:8000/messages/${message.id}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "read",
              }),
            }

          );
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "status_update",
                message_id: message.id,
                status: "read",
              })
            );
          }
          setMessages((prev) =>
            prev.map((item) =>
              item.id === message.id
                ? { ...item, status: "read" }
                : item
            )
          );
        } catch (error) {
          console.error(
            "Failed to mark message as read:",
            error
          );
        }
      }
    };

    markMessagesAsRead();
  }, [selectedChat, messages]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);
  useEffect(() => {
    if (selectedChat === null) {
      return;
    }

    const fetchMessages = async () => {
      try {
        setMessagesLoading(true);

        const response = await fetch(
          `http://localhost:8000/messages/${selectedChat}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await response.json();

        console.log("MESSAGES:", data);

        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [selectedChat]);
  const selectedConversation = conversations.find(
    (chat) => chat.id === selectedChat
  );

  const formatTime = (time: string) => {
    const date = new Date(time);

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const sendMessage = () => {
    if (!messageText.trim()) return;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket is not connected");
      return;
    }

    socket.send(
      JSON.stringify({
        type: "message",
        content: messageText,
      })
    );

    setMessageText("");
  };
  if (typingTimeout.current) {
    clearTimeout(typingTimeout.current);
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: "typing",
        is_typing: false,
      })
    );
  }
  async function addGroupMember(memberId: number) {
    if (!selectedChat) return;

    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
      );

      const response = await fetch(
        `http://127.0.0.1:8000/conversations/${selectedChat}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            member_id: memberId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to add member");
      }

      await loadGroupMembers(selectedChat);
      setShowAddMember(false);

    } catch (error) {
      console.error("Failed to add member:", error);
    }
  }
  async function removeGroupMember(memberId: number) {
    if (!selectedChat) return;

    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
      );

      const response = await fetch(
        `http://127.0.0.1:8000/conversations/${selectedChat}/members`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            member_id: memberId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to remove member");
      }

      await loadGroupMembers(selectedChat);

    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  }
  async function markMessagesAsRead(conversationId: number) {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
      );

      const unreadMessages = messages.filter(
        (message) =>
          message.conversation_id === conversationId &&
          message.sender_id !== currentUser.id &&
          message.status !== "read"
      );

      for (const message of unreadMessages) {
        await fetch(
          `http://127.0.0.1:8000/messages/${message.id}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "read",
            }),
          }
        );
      }
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  }
  async function loadGroupMembers(conversationId: number) {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/conversations/${conversationId}/members`
      );

      if (!response.ok) {
        throw new Error("Failed to load group members");
      }

      const data = await response.json();
      setGroupMembers(data);
      setShowGroupMembers(true);
    } catch (error) {
      console.error("Failed to load group members:", error);
    }
  }
  async function startConversation(otherUserId: number) {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
      );

      if (!currentUser.id) {
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/conversations/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            other_user_id: otherUserId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const conversation = await response.json();

      // Close modal
      setShowNewMessage(false);
      setUserSearch("");
      // Open conversation
      setSelectedChat(conversation.id);

      // Refresh conversation list
      const refreshed = await fetch(
        `http://127.0.0.1:8000/conversations/${currentUser.id}`
      );

      if (refreshed.ok) {
        const data = await refreshed.json();
        setConversations(data);
      }

    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }
  async function createGroup() {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
      );

      if (!currentUser.id || !groupName.trim()) {
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/conversations/group",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            name: groupName.trim(),
            member_ids: [
              currentUser.id,
              ...selectedMembers,
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create group");
      }

      const group = await response.json();

      setShowNewGroup(false);
      setGroupName("");
      setSelectedMembers([]);

      setSelectedChat(group.id);

      // Refresh conversations
      const refreshed = await fetch(
        `http://127.0.0.1:8000/conversations/${currentUser.id}`
      );

      if (refreshed.ok) {
        const data = await refreshed.json();
        setConversations(data);
      }

    } catch (error) {
      console.error("Failed to create group:", error);
    }
  }
  async function loadUsers() {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
      );

      if (!currentUser.id) {
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/conversations/users/${currentUser.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();

      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  }
  return (
    <main className="flex h-screen bg-[#f5f5f5] text-[#111]">

      {/* Sidebar */}
      <aside className="flex w-[360px] flex-col border-r border-[#ddd] bg-white">

        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-5">

          <h1 className="text-2xl font-semibold">
            Signal
          </h1>

          <div className="flex gap-3">

            <button className="rounded-full p-2 hover:bg-gray-100">
              <Edit size={21} />
            </button>

            <button className="rounded-full p-2 hover:bg-gray-100">
              <Settings size={21} />
            </button>

          </div>

        </div>

        {/* Search */}
        <div className="px-4 pb-4">

          <div className="flex items-center rounded-xl bg-[#f0f0f0] px-3 py-2.5">

            <Search
              size={18}
              className="text-gray-500"
            />

            <input
              type="text"
              placeholder="Search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="ml-2 w-full bg-transparent outline-none"
            />

          </div>

        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">

          {loading ? (

            <div className="px-5 py-4 text-sm text-gray-500">
              Loading conversations...
            </div>

          ) : conversations.length === 0 ? (

            <div className="px-5 py-4 text-sm text-gray-500">
              No conversations yet.
            </div>

          ) : (

            conversations.filter((chat) =>
              chat.name.toLowerCase().includes(searchText.toLowerCase())
            ).map((chat) => (

              <button
                key={chat.id}
                onClick={() => {
                  setSelectedChat(chat.id);

                  setUnreadCounts((prev) => ({
                    ...prev,
                    [chat.id]: 0,
                  }));

                  markMessagesAsRead(chat.id);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 ${selectedChat === chat.id
                  ? "bg-[#eeeeee]"
                  : ""
                  }`}
              >

                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-300 text-lg font-medium">

                  {chat.name.charAt(0)}

                </div>

                {/* Chat information */}
                <div className="min-w-0 flex-1">

                  <div className="flex justify-between">

                    <span className="font-medium">
                      {chat.name}
                    </span>

                    <span className="text-xs text-gray-500">

                      {formatTime(
                        chat.last_message_time
                      )}

                    </span>

                  </div>

                  <div className="mt-1 flex justify-between">

                    <p className="truncate text-sm text-gray-500">

                      {chat.last_message || "No messages yet"}

                    </p>
                    {unreadCounts[chat.id] > 0 && (
                      <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-xs text-white">
                        {unreadCounts[chat.id]}
                      </span>
                    )}
                  </div>

                </div>

              </button>

            ))

          )}

        </div>

        {/* New Chat */}
        <div className="border-t p-4">

          <button
            onClick={() => {
              setShowNewMessage(true);
              loadUsers();
            }}
            className="..."
          >
            <Plus size={18} />
            New message
          </button>
          <button
            onClick={() => {
              setShowNewGroup(true);
              loadUsers();
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 font-medium hover:bg-gray-100"
          >
            <Plus size={18} />
            Create group
          </button>
        </div>

      </aside>

      {/* Chat Area */}
      <section className="flex flex-1 flex-col">

        {selectedConversation ? (

          <>

            {/* Chat Header */}
            <header className="flex items-center justify-between border-b bg-white px-6 py-4">
              {showNewMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="text-xl font-semibold">
                        New message
                      </h2>

                      <button
                        onClick={() => {
                          setShowNewMessage(false);
                          setUserSearch("");
                        }}
                        className="text-xl text-gray-500 hover:text-black"
                      >
                        ×
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Search people..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="mb-4 w-full rounded-xl bg-gray-100 px-4 py-3 outline-none"
                    />

                    <div className="max-h-80 overflow-y-auto">
                      {users.filter((user) =>
                        user.display_name
                          ?.toLowerCase()
                          .includes(userSearch.toLowerCase()) ||
                        user.username
                          ?.toLowerCase()
                          .includes(userSearch.toLowerCase())
                      ).map((user) => (
                        <button
                          key={user.id}
                          onClick={() => startConversation(user.id)}
                          className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-gray-100"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                            {user.display_name?.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="font-medium">
                              {user.display_name}
                            </p>

                            <p className="text-sm text-gray-500">
                              @{user.username}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 font-medium">

                  {selectedConversation.name.charAt(0)}

                </div>

                <div>

                  <h2 className="font-semibold">

                    {selectedConversation.name}

                  </h2>

                  <p className="text-xs text-gray-500">
                    {typingUsers.length > 0
                      ? "Someone is typing..."
                      : onlineUsers.length > 1
                        ? `${onlineUsers.length} members online`
                        : "Offline"}
                  </p>

                </div>

              </div>

              <button
                onClick={() => {
                  if (selectedConversation.type === "group") {
                    loadGroupMembers(selectedConversation.id);
                  }
                }}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <MoreVertical size={20} />
              </button>

            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-[#f5f5f5] p-6">

              {messagesLoading ? (

                <div className="text-center text-sm text-gray-500">
                  Loading messages...
                </div>

              ) : messages.length === 0 ? (

                <div className="text-center text-sm text-gray-500">
                  No messages yet.
                </div>

              ) : (

                messages.map((message) => {

                  const currentUser = JSON.parse(
                    localStorage.getItem("currentUser") || "{}"
                  );

                  const isMine = message.sender_id === currentUser.id;

                  return (
                    <div
                      key={message.id}
                      className={`mb-4 flex ${isMine ? "justify-end" : "justify-start"
                        }`}
                    >

                      <div
                        className={`max-w-[60%] rounded-2xl px-4 py-3 shadow-sm ${isMine
                          ? "bg-[#d9fdd3]"
                          : "bg-white"
                          }`}
                      >

                        <p>
                          {message.content}
                        </p>

                        <span className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-400">
                          {formatTime(message.created_at)}

                          {isMine && (
                            <span
                              className={
                                message.status === "read"
                                  ? "text-blue-500"
                                  : "text-gray-400"
                              }
                            >
                              {message.status === "sent"
                                ? "✓"
                                : "✓✓"}
                            </span>
                          )}
                        </span>

                      </div>

                    </div>
                  );

                })

              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t bg-white p-4">

              <div className="flex items-center gap-3">

                <input
                  type="text"
                  placeholder="Write a message..."
                  value={messageText}
                  onChange={(e) => {
                    const value = e.target.value;

                    setMessageText(value);

                    if (socket && socket.readyState === WebSocket.OPEN) {
                      socket.send(
                        JSON.stringify({
                          type: "typing",
                          is_typing: true,
                        })
                      );

                      if (typingTimeout.current) {
                        clearTimeout(typingTimeout.current);
                      }

                      typingTimeout.current = setTimeout(() => {
                        if (socket && socket.readyState === WebSocket.OPEN) {
                          socket.send(
                            JSON.stringify({
                              type: "typing",
                              is_typing: false,
                            })
                          );
                        }
                      }, 1000);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                  className="flex-1 rounded-full bg-[#f0f0f0] px-5 py-3 outline-none"
                />

                <button
                  onClick={sendMessage}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800"
                >
                  <Send size={19} />
                </button>

              </div>

            </div>

          </>

        ) : (

          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center">

            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-3xl">

              💬

            </div>

            <h2 className="text-xl font-semibold">

              Select a conversation

            </h2>

            <p className="mt-2 text-gray-500">

              Choose a conversation to start messaging

            </p>

          </div>

        )}

      </section>
      {/* Create Group Modal */}
      {showNewGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

            {/* Header */}
            <div className="mb-5 flex items-center justify-between">

              <h2 className="text-xl font-semibold">
                Create Group
              </h2>

              <button
                onClick={() => {
                  setShowNewGroup(false);
                  setGroupName("");
                  setSelectedMembers([]);
                }}
                className="text-xl text-gray-500 hover:text-black"
              >
                ×
              </button>

            </div>

            {/* Group Name */}
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mb-4 w-full rounded-xl bg-gray-100 px-4 py-3 outline-none"
            />

            {/* Members */}
            <p className="mb-2 text-sm font-medium">
              Select members
            </p>

            <div className="max-h-64 overflow-y-auto">

              {users.map((user) => {

                const selected = selectedMembers.includes(user.id);

                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedMembers((prev) =>
                        selected
                          ? prev.filter((id) => id !== user.id)
                          : [...prev, user.id]
                      );
                    }}
                    className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-gray-100 ${selected ? "bg-gray-100" : ""
                      }`}
                  >

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                      {user.display_name?.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1">

                      <p className="font-medium">
                        {user.display_name}
                      </p>

                      <p className="text-sm text-gray-500">
                        @{user.username}
                      </p>

                    </div>

                    <div className="text-lg">
                      {selected ? "✓" : ""}
                    </div>

                  </button>
                );
              })}

            </div>

            {/* Create Button */}
            <button
              onClick={createGroup}
              disabled={
                !groupName.trim() ||
                selectedMembers.length === 0
              }
              className="mt-5 w-full rounded-xl bg-black py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Create Group
            </button>

          </div>

        </div>
      )}
      {showGroupMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

            <div className="mb-5 flex items-center justify-between">

              <h2 className="text-xl font-semibold">
                Group Members
              </h2>

              <button
                onClick={() => setShowGroupMembers(false)}
                className="text-xl text-gray-500 hover:text-black"
              >
                ×
              </button>

            </div>

            <div className="max-h-80 overflow-y-auto">

              {groupMembers.map((member) => {

                const currentUser = JSON.parse(
                  localStorage.getItem("currentUser") || "{}"
                );

                const isAdmin = groupMembers.some(
                  (m) =>
                    m.id === currentUser.id &&
                    m.is_admin
                );

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl p-3"
                  >

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                      {member.display_name?.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1">

                      <p className="font-medium">
                        {member.display_name}
                      </p>

                      <p className="text-sm text-gray-500">
                        @{member.username}
                      </p>

                    </div>

                    {member.is_admin && (
                      <span className="text-xs font-medium text-gray-500">
                        Admin
                      </span>
                    )}

                    {isAdmin &&
                      member.id !== currentUser.id && (
                        <button
                          onClick={() =>
                            removeGroupMember(member.id)
                          }
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}

                  </div>
                );
              })}
               </div>
               {/* Add member button OUTSIDE scroll area */}
              {(() => {
                const currentUser = JSON.parse(
                  localStorage.getItem("currentUser") || "{}"
                );

                const isAdmin = groupMembers.some(
                  (member) =>
                    member.id === currentUser.id &&
                    member.is_admin
                );

                return isAdmin ? (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="mt-4 w-full rounded-xl bg-black py-3 font-medium text-white hover:bg-gray-800"
                  >
                    Add member
                  </button>
                ) : null;
              })()}

            

          </div>

        </div>
      )}
      {showAddMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

            <div className="mb-5 flex items-center justify-between">

              <h2 className="text-xl font-semibold">
                Add Member
              </h2>

              <button
                onClick={() => setShowAddMember(false)}
                className="text-xl text-gray-500 hover:text-black"
              >
                ×
              </button>

            </div>

            <div className="max-h-80 overflow-y-auto">

              {users
                .filter(
                  (user) =>
                    !groupMembers.some(
                      (member) => member.id === user.id
                    )
                )
                .map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addGroupMember(user.id)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-gray-100"
                  >

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                      {user.display_name?.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <p className="font-medium">
                        {user.display_name}
                      </p>

                      <p className="text-sm text-gray-500">
                        @{user.username}
                      </p>
                    </div>

                  </button>
                ))}

            </div>

          </div>

        </div>
      )}
    </main>
  );
}