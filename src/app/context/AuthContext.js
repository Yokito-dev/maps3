'use client';

import { createContext, useState, useEffect, useContext } from "react";
import axios from "../utils/axios";
import { useRouter } from "next/navigation";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const res = await axios.get("/user", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setUser(res.data);

      } catch (error) {
        console.error("Gagal mengambil user:", error);

        localStorage.removeItem("auth_token");
        setUser(null);
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

      const token = res.data.access_token;

      localStorage.setItem("auth_token", token);
      setUser(res.data.user);

      const role = res.data.user.role;

      if (
        role === "supervisor" ||
        role === "admin_up3" ||
        role === "admin_ulp" ||
        role === "vendor"
      ) {
        router.push("/menu");
      } else {
        router.push("/daftaradmin");
      }

    } catch (error) {
      console.error("Login gagal:", error);
      throw new Error("Login gagal, cek username dan password.");
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      if (token) {
        await axios.post(
          "/logout",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("auth_token");
    setUser(null);

    router.push("/");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};