'use client'
import { useState } from "react";
import Image from 'next/image'
import Link from "next/link";
import { useAuth } from "../context/AuthContext"; 
// Pastikan path "../context/AuthContext" ini benar sesuai struktur folder Anda
// Jika error "Module not found", cek lokasi file AuthContext.tsx Anda.

import { useRouter } from "next/navigation";
import { IoMdSearch, IoMdMenu } from "react-icons/io";
import { FaUserCircle } from "react-icons/fa";
import Swal from "sweetalert2";

function page() {
    // Jika useAuth atau user belum siap, kita beri nilai default agar tidak error saat render
    const { user, logout } = useAuth() || { user: null, logout: () => {} }; 
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState<string>('');

    const handleLogoutClick = () => {
        Swal.fire({
            title: "Konfirmasi Logout",
            text: "Apakah Anda yakin ingin keluar?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Ya, Keluar!",
            cancelButtonText: "Batal"
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem("auth_token");
                logout();
            }
        });
    };

    // Data Menu Grid
    const dashboardMenus = [
        { id: 1, title: "Schedule GD", link: "/schedule-gd" },
        { id: 2, title: "Schedule JTM", link: "/schedule-jtm" },
        { id: 3, title: "Schedule GH GB MC", link: "/schedule-gh-gb-mc" },
        { id: 4, title: "Schedule Drone", link: "/schedule-drone" },
        { id: 5, title: "Daftar Tamu", link: "/daftaradmin" },
        { id: 6, title: "Laporan Statistik", link: "/statistik" },
        { id: 7, title: "Akses Pengguna", link: "/aksespengguna" },
        { id: 8, title: "Keluar", action: handleLogoutClick },
    ];

    const filteredMenus = dashboardMenus.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-white font-sans">
            
            {/* --- CUSTOM NAVBAR (HEADER) --- */}
            {/* Height disesuaikan agar proporsional */}
            <header className="relative w-full h-[140px] md:h-[160px]">
                
                {/* 1. BACKGROUND (SEMENTARA WARNA GRADASI AGAR TIDAK ERROR GAMBAR) */}
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-blue-300 to-cyan-200">
                    {/* Nanti jika sudah ada gambar, hapus className bg-gradient... dan uncomment kode Image di bawah ini: */}
                    
                    {/* <Image 
                        src="/path/ke/gambar-background-anda.png" 
                        alt="Header Background" 
                        fill 
                        className="object-cover object-left-top"
                        priority
                    /> 
                    */}
                </div>

                {/* 2. KONTEN NAVBAR (OVERLAY) */}
                <div className="relative z-10 flex items-center justify-between h-full px-6 md:px-12 w-full">
                    
                    {/* BAGIAN KIRI: Hamburger & Logo */}
                    <div className="flex items-center gap-4 md:gap-6 mt-4 md:mt-0">
                        <button className="text-slate-800 text-3xl md:text-4xl hover:opacity-70 transition">
                            <IoMdMenu />
                        </button>
                        
                        {/* Placeholder Logo (Ganti dengan Image nanti) */}
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tighter">PLN</h1>
                            <p className="text-xs font-semibold text-slate-700">PINISI UP3 MS</p>
                        </div>
                    </div>

                    {/* BAGIAN KANAN: Floating Blue Bar (Kapsul Biru) */}
                    <div className="hidden md:flex items-center bg-[#2FA6DE] rounded-full p-2 pl-2 pr-6 shadow-lg shadow-blue-900/10 gap-6 mt-4 md:mt-0">
                        
                        {/* Search Input (Dalam Kapsul) */}
                        <div className="relative w-[250px]">
                            <IoMdSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
                            <input 
                                type="text" 
                                placeholder="Search" 
                                className="w-full pl-12 pr-4 py-2.5 rounded-full border-none focus:ring-0 outline-none text-gray-600 bg-white placeholder:text-gray-400"
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Menu Links */}
                        <div className="flex items-center gap-6 text-white font-medium text-sm md:text-base">
                            <Link href="#" className="hover:text-blue-100 transition">Menu</Link>
                            <Link href="#" className="hover:text-blue-100 transition">Peta Pohon</Link>
                        </div>

                        {/* Profile Icon */}
                        <div className="cursor-pointer text-white hover:text-blue-100 transition">
                             <FaUserCircle className="text-3xl" />
                        </div>
                    </div>

                    {/* Mobile Only Search Icon */}
                    <div className="md:hidden bg-white p-2 rounded-full shadow-md cursor-pointer">
                        <IoMdSearch className="text-[#2FA6DE] text-2xl" />
                    </div>

                </div>
            </header>

            {/* --- MAIN CONTENT (GRID MENU) --- */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Mobile Search Bar */}
                <div className="mb-6 md:hidden relative">
                    <IoMdSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search menu..." 
                        className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {filteredMenus.map((item) => (
                        <div 
                            key={item.id}
                            onClick={item.action ? item.action : undefined}
                            className="bg-white rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_rgba(47,166,222,0.2)] transition-all duration-300 overflow-hidden border border-gray-100 cursor-pointer flex flex-col group h-64"
                        >
                            {/* Logic Link: Jika ada link pakai Link, jika tidak (seperti Logout) pakai div biasa */}
                            {item.link ? (
                                <Link href={item.link} className="flex flex-col h-full w-full">
                                    <CardContent item={item} />
                                </Link>
                            ) : (
                                <div className="flex flex-col h-full w-full">
                                    <CardContent item={item} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

// Komponen Isi Kartu (Dipisah agar rapi)
function CardContent({ item }: { item: any }) {
    return (
        <>
            <div className="flex-1 flex items-center justify-center bg-[#F8FDFF] group-hover:bg-white transition-colors relative p-6">
                {/* LOGIKA ICON:
                   Karena kita belum import gambar icon, kita pakai placeholder lingkaran biru dulu.
                   Nanti Anda bisa ubah ini menjadi <Image src={item.icon} ... /> 
                */}
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-400 text-xs text-center p-2 border-2 border-blue-100">
                    Icon<br/>{item.title}
                </div>
            </div>
            
            {/* Footer Biru */}
            <div className="bg-[#2FA6DE] text-white py-3 px-4 text-center font-semibold tracking-wide text-sm md:text-base group-hover:bg-[#258bbd] transition-colors">
                {item.title}
            </div>
        </>
    );
}

export default page;