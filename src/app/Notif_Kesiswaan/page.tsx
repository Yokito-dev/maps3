"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import BgBlur2 from "../assets/svgs/BgBlur1.svg";

// Definisi tipe data untuk notifikasi
interface Notification {
  id: string;
  message: string;
  created_at: string;
}

function Page() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Ambil notifikasi dengan user_type = kepseks
  useEffect(() => {
    // Ambil data notifikasi berdasarkan userType (misalnya 'kepseks')
    const fetchNotifications = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/notifications/type/kesiswaans/unread");
        console.log(response.data);
        setNotifications(response.data);
        setUnreadCount(response.data.length); // Update unreadCount based on notifications
      } catch (err) {
        setError("Gagal mengambil notifikasi");
      }
    };


    fetchNotifications();
  }, []);

  // Toggle semua checkbox
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n.id));
    }
    setSelectAll(!selectAll);
  };

  // Toggle satu notifikasi
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Tandai satu notifikasi
  const markAsRead = async (id: string) => {
    try {
      await axios.put(`http://localhost:8000/api/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      setUnreadCount(prev => prev - 1); // Decrease unread count when marking as read
    } catch (err) {
      setError("Terjadi kesalahan saat menandai notifikasi.");
    }
  };

  // Tandai semua notifikasi terpilih
  const markSelectedAsRead = async () => {
    try {
      await axios.put("http://localhost:8000/api/notifications/read/all", {
        ids: selectedIds,
      });
      setNotifications((prev) =>
        prev.filter((notif) => !selectedIds.includes(notif.id))
      );
      setUnreadCount(prev => prev - selectedIds.length);
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      setError("Gagal menandai notifikasi terpilih.");
    }
  };

  return (
    <div className="relative min-h-screen p-8 flex items-center justify-center">
      <div className="absolute inset-0 z-[-1]">
        <Image
          src={BgBlur2}
          alt="Background"
          layout="fill"
          objectFit="cover"
          className="opacity-70 blur-md"/>
      </div>

      <div className="relative bg-white border border-gray-300 rounded-lg p-6 shadow-lg w-full max-w-3xl backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-lg font-bold">
          ❌
        </button>

        <h2 className="text-xl font-semibold text-gray-700 text-center mb-4">Notifikasi Kesiswaan</h2>

        {error && <p className="text-red-500 text-center">{error}</p>}

        {loading ? (
          <p className="text-gray-500 text-center">Loading...</p>
        ) : notifications.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}/>
                <span className="text-sm text-gray-600">Pilih Semua</span>
              </label>

              {selectedIds.length > 0 && (
                <button
                  onClick={markSelectedAsRead}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
                  Tandai Semua Dibaca
                </button>
              )}
            </div>

            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="flex justify-between items-center bg-gray-100 p-3 rounded-md">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(notif.id)}
                      onChange={() => toggleSelectOne(notif.id)}/>
                    <span className="text-gray-700 text-sm">{notif.message}</span>
                  </label>
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold">
                    Tandai Dibaca
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center">Tidak ada notifikasi baru untuk Kesiswaan.</p>
        )}
      </div>
    </div>
  );
}

export default Page;
