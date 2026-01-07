'use client'
import { useState } from "react";
import Image from 'next/image'
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import bg from '@/app/assets/plnup3/bg.jpg'
import logo from '@/app/assets/plnup3/logo.png'
import schgd from '@/app/assets/plnup3/SCHEDULE GD.jpeg'
import schjtm from '@/app/assets/plnup3/SCHEDULE JTM.jpeg'
import schghgbmc from '@/app/assets/plnup3/SCHEDULE GH GB MC.jpeg'
import schdrone from '@/app/assets/plnup3/SCHEDULE DRONE.jpeg'
import hslinpksigd from '@/app/assets/plnup3/HASIL INSPEKSI GD.jpeg'
import hslinpksijtm from '@/app/assets/plnup3/HASIL INSPEKSI JTM.jpeg'
import hslinpksighgbmc from '@/app/assets/plnup3/HASIL INSPEKSI GH GB MC.jpeg'
import manajemen from '@/app/assets/plnup3/MANAJEMEN TRAFO.jpeg'
import pmlihraanghgbmc from '@/app/assets/plnup3/PEMELIHARAAN GH GB MC.jpeg'
import pmlihraangt from '@/app/assets/plnup3/PEMELIHARAAN GT.jpeg'
import pmlihraanjtm from '@/app/assets/plnup3/PEMELIHARAAN JTM.jpeg'
import net from '@/app/assets/plnup3/NET MONITOR.jpeg'
import tebang from '@/app/assets/plnup3/PENEBANGAN POHON.jpeg'
import jangkut from '@/app/assets/plnup3/JASA ANGKUT 1.jpg'
import terimabbm from '@/app/assets/plnup3/PENERIMAAN BBM.jpeg'
import kirimbbm from '@/app/assets/plnup3/PENGIRIMAN BBM (TRANSPORTIR).jpeg'


// Pastikan path "../context/AuthContext" ini benar sesuai struktur folder Anda
// Jika error "Module not found", cek lokasi file AuthContext.tsx Anda.

import { useRouter } from "next/navigation";
import { IoMdSearch, IoMdMenu } from "react-icons/io";
import { FaUserCircle } from "react-icons/fa";
import Swal from "sweetalert2";

function page() {
    // Jika useAuth atau user belum siap, kita beri nilai default agar tidak error saat render
    const { user, logout } = useAuth() || { user: null, logout: () => { } };
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
        { id: 1, title: "Schedule GD", link: "/schedule-gd", image: schgd },
        { id: 2, title: "Schedule JTM", link: "/schedule-jtm", image: schjtm },
        { id: 3, title: "Schedule GH GB MC", link: "/schedule-gh-gb-mc", image: schghgbmc },
        { id: 4, title: "Schedule Drone", link: "/schedule-drone", image: schdrone },
        { id: 5, title: "Hasil Inspeksi GD", link: "/hasil-inspeksi-gd", image: hslinpksigd },
        { id: 6, title: "Hasil Inspeksi JTM", link: "/hasil-inspeksi-jtm", image: hslinpksijtm },
        { id: 7, title: "Hasil Inspeksi GH GB MC", link: "/hasil-inspeksi-gh-gb-mc", image: hslinpksighgbmc },
        { id: 8, title: "Manajemen Trafo", link: "/manajemen-trafo", image: manajemen },
        { id: 9, title: "Pemeliharaan GH GB MC", link: "/pemeliharaan-gh-gb-mc", image: pmlihraanghgbmc },
        { id: 10, title: "Pemeliharaan GT", link: "/pemeliharaan-gt", image: pmlihraangt },
        { id: 11, title: "Pemeliharaan JTM", link: "/pemeliharaan-jtm", image: pmlihraanjtm },
        { id: 12, title: "Net Monitor", link: "/net-monitor", image: net },
        { id: 13, title: "Penebangan Pohon", link: "/penebangan-pohon", image: tebang },
        { id: 14, title: "Jasa Angkut", link: "/jasa-angkut", image: jangkut },
        { id: 15, title: "Penerimaan BBM", link: "/penerimaan-bbm", image: terimabbm },
        { id: 16, title: "Pengiriman BBM (Transportir)", link: "/pengiriman-bbm", image: kirimbbm },
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

                    {/* 1. BACKGROUND IMAGE */}
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={bg}
                            alt="Header Background"
                            fill
                            className="object-cover object-left-top"
                            priority
                        />
                    </div>
                </div>

                {/* 2. KONTEN NAVBAR (OVERLAY) */}
                <div className="relative z-10 flex items-center justify-between h-full px-6 md:px-12 w-full">

                    {/* BAGIAN KIRI: Hamburger & Logo */}
                    <div className="flex items-center gap-4 md:gap-6 mt-4 md:mt-0">
                        <button className="text-slate-800 text-3xl md:text-4xl hover:opacity-70 transition">
                            <IoMdMenu />
                        </button>
                        <Image src={logo} alt="PLN Logo" width={140} height={60} className="object-contain" />
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
            <main
                className="max-w-7xl mx-auto px-6 py-10 bg-white rounded-t-3xl -mt-10 relative z-20 shadow-xl"
            >
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
        <div
            className="
                group
                flex flex-col items-center justify-center
                bg-gradient-to-r from-[#2FA6DE] to-[#225E65]
                text-white
                p-6
                rounded-2xl
                transition-all duration-300 ease-out
                hover:scale-[1.05]
            "
        >
            {/* IMAGE */}
            <div
                className="
                    w-40 h-40
                    rounded-md
                    overflow-hidden
                    mb-4
                "
            >
                <Image
                    src={item.image}
                    alt={item.title}
                    className="
                        w-full h-full object-cover
                        transition-transform duration-300 ease-out
                        group-hover:scale-110
                    "
                />
            </div>

            {/* TITLE */}
            <h3 className="text-sm md:text-base font-semibold text-center tracking-wide">
                {item.title}
            </h3>
        </div>
    )
}




export default page;