'use client'
import { useState } from "react";
import Image from 'next/image'
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

import bg from '@/app/assets/plnup3/bg.jpg'
import logo from '@/app/assets/plnup3/logo.png'
import schgd from '@/app/assets/plnup3/SCHEDULE GD.jpeg'
import schjtm from '@/app/assets/plnup3/SCHEDULE JTM.jpeg'
import schghgbmc from '@/app/assets/plnup3/SCHEDULE GH GB MC.jpeg'
import hslinpksigd from '@/app/assets/plnup3/HASIL INSPEKSI GD.jpeg'
import hslinpksijtm from '@/app/assets/plnup3/HASIL INSPEKSI JTM.jpeg'
import hslinpksighgbmc from '@/app/assets/plnup3/HASIL INSPEKSI GH GB MC.jpeg'
import pmlihraanghgbmc from '@/app/assets/plnup3/PEMELIHARAAN GH GB MC.jpeg'
import pmlihraangt from '@/app/assets/plnup3/PEMELIHARAAN GT.jpeg'
import pmlihraanjtm from '@/app/assets/plnup3/PEMELIHARAAN JTM.jpeg'

import {
    IoMdMenu,
    IoMdSearch,
    IoIosBookmarks,
    IoMdBarcode,
    IoMdOptions,
    IoIosFolder,
    IoIosFolderOpen,
} from "react-icons/io";
import { IoLogOutOutline } from "react-icons/io5";

import Swal from "sweetalert2";

export default function Page() {
    const { logout } = useAuth() || { logout: () => { } };
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

    const dashboardMenus = [
        { id: 1, title: "Schedule GD", link: "/schedule-gd", image: schgd },
        { id: 2, title: "Schedule JTM", link: "/schedule-jtm", image: schjtm },
        { id: 3, title: "Schedule GH GB MC", link: "/schedule-gh-gb-mc", image: schghgbmc },
        { id: 4, title: "Hasil Inspeksi GD", link: "/hasil-inspeksi-gd", image: hslinpksigd },
        { id: 5, title: "Hasil Inspeksi JTM", link: "/hasil-inspeksi-jtm", image: hslinpksijtm },
        { id: 6, title: "Hasil Inspeksi GH GB MC", link: "/hasil-inspeksi-gh-gb-mc", image: hslinpksighgbmc },
        { id: 7, title: "Pemeliharaan GH GB MC", link: "/pemeliharaan-gh-gb-mc", image: pmlihraanghgbmc },
        { id: 8, title: "Pemeliharaan GT", link: "/pemeliharaan-gt", image: pmlihraangt },
        { id: 9, title: "Pemeliharaan JTM", link: "/pemeliharaan-jtm", image: pmlihraanjtm },
    ];

    const filteredMenus = dashboardMenus.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen font-sans">
            {/* BACKGROUND */}
            <div className="fixed inset-0 -z-10">
                <Image src={bg} alt="Background" fill className="object-cover" priority />
            </div>

            {/* HEADER */}
            <header className="relative w-full h-[110px] sm:h-[130px] md:h-[160px]">
                <div className="relative z-10 flex items-center justify-between h-full px-4 sm:px-6 md:px-12">

                    {/* LEFT */}
                    <div className="flex items-center gap-3 md:gap-6">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="text-slate-800 text-3xl md:text-4xl"
                        >
                            <IoMdMenu />
                        </button>
                        <Image src={logo} alt="PLN Logo" width={120} height={60} />
                    </div>

                    {/* RIGHT MOBILE */}
                    <div className="flex md:hidden items-center gap-4">
                        <Link
                            href="/peta-pohon"
                            className="text-sm font-medium text-white bg-gradient-to-r from-[#2FA6DE] to-[#225E65] rounded-full p-2 pr-2 gap-6 shadow-lg"
                        >
                            Peta Pohon
                        </Link>
                    </div>

                    {/* RIGHT DESKTOP */}
                    <div className="hidden md:flex items-center bg-gradient-to-r from-[#2FA6DE] to-[#225E65] rounded-full p-2 pr-6 gap-6 shadow-lg">
                        <div className="relative w-[250px]">
                            <IoMdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full pl-12 pr-4 py-2.5 rounded-full outline-none"
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-6 text-white font-medium">
                            <Link href="#">Menu</Link>
                            <Link href="/peta-pohon">Peta Pohon</Link>
                        </div>
                    </div>

                </div>
            </header>

            {/* SIDEBAR */}
            <div className={`
                fixed top-0 left-0 h-full w-64 sm:w-72
                bg-white shadow-2xl z-50
                rounded-tr-2xl rounded-br-2xl
                sm:rounded-tr-3xl sm:rounded-br-3xl
                transform transition-transform duration-300
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <Image src={logo} alt="Logo" width={120} height={60} />
                    <button onClick={() => setIsSidebarOpen(false)} className="text-xl">✕</button>
                </div>

                <nav className="p-6 space-y-4">
                    <SidebarLink href="/aset-gardu" icon={<IoIosBookmarks />} label="Aset Gardu" close={setIsSidebarOpen} />
                    <SidebarLink href="/aset-gh-gb-mc" icon={<IoMdBarcode />} label="Aset GH GB MC" close={setIsSidebarOpen} />
                    <SidebarLink href="/aset-jtm" icon={<IoMdOptions />} label="Aset JTM" close={setIsSidebarOpen} />
                    <SidebarLink href="/file-gd" icon={<IoIosFolder />} label="File GD" close={setIsSidebarOpen} />
                    <SidebarLink href="/file-jtm" icon={<IoIosFolderOpen />} label="File JTM" close={setIsSidebarOpen} />

                    <hr />

                    <button
                        onClick={handleLogoutClick}
                        className="flex items-center gap-2 text-red-600"
                    >
                        <IoLogOutOutline />
                        Logout
                    </button>
                </nav>
            </div>

            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40" />
            )}

            {/* MAIN */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 bg-white rounded-2xl sm:rounded-3xl shadow-xl">
                {/* MOBILE SEARCH */}
                <div className="mb-6 md:hidden relative">
                    <IoMdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search menu..."
                        className="w-full pl-10 pr-4 py-2 rounded-full border"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredMenus.map(item => (
                        <Link key={item.id} href={item.link}>
                            <CardContent item={item} />
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}

/* ===== COMPONENTS ===== */

function SidebarLink({ href, icon, label, close }: any) {
    return (
        <Link
            href={href}
            onClick={() => close(false)}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
        >
            {icon}
            {label}
        </Link>
    );
}

function CardContent({ item }: any) {
    return (
        <div className="group flex flex-col items-center justify-center bg-gradient-to-r from-[#2FA6DE] to-[#225E65] text-white p-5 rounded-2xl transition hover:scale-105">
            <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 overflow-hidden rounded-md mb-4">
                <Image
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition group-hover:scale-110"
                />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-center">
                {item.title}
            </h3>
        </div>
    );
}
