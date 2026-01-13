"use client";
import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Image from "next/image";

import bgPINISIpln from "../assets/plnup3/BGLogin.svg";
import PinisiPLNLogo from "../assets/plnup3/pinisiplnlogo.svg";
import PinisiPLNLogoPutih from "../assets/plnup3/LOGOPLNPUTIH.svg";

export default function Page() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);

  const [form, setForm] = React.useState({
    username: "",
    password: "",
  });
  const [error, setError] = React.useState("");
  const [showError, setShowError] = React.useState(false);

  useEffect(() => {
    let timer;
    if (showError) {
      timer = setTimeout(() => {
        setShowError(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showError]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
    } catch (err) {
      const msg = err?.response?.data?.message || "Periksa username/password.";
      setError(msg);
      setShowError(true);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-white overflow-hidden relative">

      {/* ================= POPUP ERROR ================= */}
      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 transform scale-100 transition-transform duration-300 text-center border-l-8 border-red-500">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
              Akses Ditolak
            </h3>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      )}

      {/* ================= BAGIAN GAMBAR ================= */}
      <div className="relative w-full h-[45vh] md:h-full md:w-1/2 z-0">
        <Image
          src={bgPINISIpln}
          alt="PLN Background"
          fill
          priority
          className="object-cover" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#28A8E0]/50 to-white/30 z-10 md:hidden" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#28A8E0]/50 via-[#28A8E0]/10 to-white/10" />

        {/* Text Desktop */}
        <div className="absolute inset-0 hidden md:flex items-center z-10">
          <div className="ml-16 lg:ml-24 max-w-lg text-white drop-shadow-lg [text-shadow:0_1px_4px_rgba(0,0,0,0.6)] hover:text-[#28A8E0] transition">
            <h1 className="text-5xl lg:text-6xl font-semibold leading-[1.15]">
              Masukkan <br /> akun Anda.
            </h1>
            <p className="mt-3 text-xl lg:text-2xl font-medium">
              Kelola pekerjaan Anda lebih mudah.
            </p>
          </div>
        </div>

        {/* Logo Mobile */}
        <div className="absolute inset-0 flex items-center justify-center pb-16 md:hidden z-20">
          <Image
            src={PinisiPLNLogoPutih}
            alt="PLN PINISI"
            width={200}
            height={70}
            className="object-contain drop-shadow-md" />
        </div>
      </div>

      {/* ================= BAGIAN FORM ================= */}
      <div className="relative w-full md:w-1/2 -mt-10 md:mt-0 z-20 flex-1">

        <div className="absolute inset-y-0 -left-[6%] w-[20%] bg-[#28A8E0] rounded-l-[40px] z-10 hidden md:block"></div>

        <div className="relative h-full w-full bg-white rounded-t-[40px] md:rounded-l-[40px]
                        shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.4),0_-30px_0_0_#28A8E0]
                        md:shadow-2xl flex items-center justify-center z-20 pt-12 md:pt-0">

          <div className="w-full max-w-md px-8 lg:px-12 pb-20 md:pb-0">

            <div className="hidden md:flex justify-center mb-10">
              <Image
                src={PinisiPLNLogo}
                alt="PLN PINISI UP3 MS"
                width={240}
                height={80}
                className="object-contain" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 -mt-20 lg:mt-1">

              <input
                suppressHydrationWarning
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Nama Pengguna :"
                required
                className="w-full px-7 py-3 rounded-full bg-gray-50 border border-gray-300
                           focus:bg-white focus:border-[#28A8E0] focus:ring-2
                           focus:ring-[#28A8E0]/20 outline-none text-base
                           shadow-[0_0_15px_rgba(0,0,0,0.3)]"/>

              <div className="relative">
                <input
                  suppressHydrationWarning
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Kata Sandi :"
                  required
                  className="w-full px-7 py-3 rounded-full bg-gray-50 border border-gray-300
               focus:bg-white focus:border-[#28A8E0] focus:ring-2
               focus:ring-[#28A8E0]/20 outline-none text-base
               shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                />

                {/* ICON MATA (SHAPE / LINE, BUKAN STIKER) */}
                <button
                suppressHydrationWarning 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPassword ? (
                    /* eye-off */
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 3l18 18M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6 M9.9 5.1A10 10 0 0112 5c5 0 9 5 9 7" />
                    </svg>
                  ) : (
                    /* eye */
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.5 12C3.7 8 7.5 5 12 5s8.3 3 9.5 7 -1.2 4-9.5 7-8.3-3-9.5-7z" />
                    </svg>
                  )}
                </button>
              </div>

              <button
                suppressHydrationWarning
                type="submit"
                className="w-full py-2 bg-[#28A8E0] hover:bg-[#2196d9]
                           text-white rounded-full text-lg font-semibold
                           shadow-lg hover:shadow-xl transition">
                LOGIN
              </button>

              <p className="text-right text-gray-500 text-sm underline cursor-pointer hover:text-[#28A8E0]">
                Ingat username
              </p>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
