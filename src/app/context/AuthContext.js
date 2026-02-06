'use client';
import { createContext, useState, useEffect, useContext } from "react";
import axios from "../utils/axios";
import { useRouter } from "next/navigation";

// Inisialisasi context
export const AuthContext = createContext();

// Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      try {
        const res = await axios.get("/user", {
          headers: { Authorization: `Bearer ${token}` }, // Perbaikan spasi pada Bearer
        });
        setUser(res.data);
      } catch (error) {
        console.error("Gagal mengambil data pengguna:", error);
        localStorage.removeItem("auth_token");
        setUser(null);
        // Opsional: Redirect ke login jika token tidak valid
        // router.push("/login"); 
      }
    };

    fetchUser();
  }, []);

  const login = async (form) => {
    if (!form.username || !form.password) {
      throw new Error("Username dan password harus diisi.");
    }

    try {
      const res = await axios.post("/login", form);
      localStorage.setItem("auth_token", res.data.access_token);
      setUser(res.data.user);

      // Routing berdasarkan role
      // Pastikan folder tujuan (lobby, dashboard, dll) memiliki page.tsx
      if (res.data.user.role === "inspektor") {
        router.push("/menu");
      } else if (res.data.user.role === "admin") {
        router.push("/menu");
      } else {
        router.push("/daftaradmin");
      }
    } catch (e) {
      console.error("Login gagal:", e.response?.data?.message || e.message);
      throw new Error("Login gagal, periksa kembali username dan password.");
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        await axios.post("/logout", null, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.error("Logout gagal:", e);
    } finally {
      // --- PERUBAHAN UTAMA DI SINI ---
      localStorage.removeItem("auth_token");
      setUser(null);

      // Mengarahkan ke halaman login utama (page.tsx)
      // Jika file login Anda ada di: app/login/page.tsx -> gunakan "/login"
      // Jika file login Anda ada di: app/page.tsx (root) -> gunakan "/"
      
      router.push("/login"); 
      router.refresh(); // Membersihkan cache client-side agar state benar-benar segar
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook custom
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth harus digunakan dalam AuthProvider");
  }
  return context;
};