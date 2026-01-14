'use client'
import { useState } from "react";
import Image from 'next/image'
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

import bg from '@/app/assets/plnup3/bg.jpg'
import logo from '@/app/assets/plnup3/Logoplnpinisigelap.svg'
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
import { IoLogOutOutline, IoMapSharp } from "react-icons/io5";
import Swal from "sweetalert2";

export default function Page() {
    const { logout } = useAuth() || { logout: () => { } };
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();


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
        <div className="h-[100svh] font-poppins relative flex flex-col overflow-hidden">
            {/* ===== DESKTOP BACKGROUND ===== */}
            <div className="hidden md:block fixed inset-0 -z-10">
                <Image
                    src={bg}
                    alt="Background Desktop"
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover" />
            </div>

            {/* ===== MOBILE BACKGROUND (ANTI GOYANG) ===== */}
            <div className="md:hidden fixed inset-0 -z-10 pointer-events-none">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-[-10%]">
                        <Image
                            src={bg}
                            alt="Background Mobile"
                            fill
                            priority
                            sizes="100vw"
                            className="object-cover transform-gpu scale-110" />
                    </div>
                </div>
            </div>

            {/* HEADER */}
            <header className="relative w-full shrink-0 pt-4 pb-6 md:pb-8 mt-2">
                <div className="relative z-10 flex items-center justify-between h-full px-4 sm:px-6 md:px-12">

                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-3xl">
                            <IoMdMenu />
                        </button>
                        <Image src={logo} alt="PLN Logo" width={120} height={60} />
                    </div>

                    <div className="md:hidden bg-gradient-to-r from-[#2FA6DE] to-[#225E65] rounded-full p-[3px] flex gap-[3px] shadow-lg scale-[0.9] sm:scale-100">
                        <Link
                            href="/dashboard"
                            className={`px-3 py-1 text-[12px] sm:text-sm rounded-full transition ${pathname === "/dashboard"
                                ? "bg-white/25 text-white shadow"
                                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                                }`}>
                            Menu
                        </Link>

                        <Link
                            href="/peta-pohon"
                            className={`px-3 py-1 text-[12px] sm:text-sm rounded-full transition ${pathname === "/peta-pohon"
                                ? "bg-white/20 text-white shadow-sm"
                                : "text-white/80 hover:bg-white/20 hover:text-white"
                                }`}>
                            Peta Pohon
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center bg-gradient-to-r from-[#2FA6DE] to-[#225E65] rounded-full p-2 pr-6 gap-6 shadow-lg">
                        <div className="relative w-[250px]">
                            <IoMdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full pl-12 pr-4 py-2.5 rounded-full outline-none"
                                onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex gap-3 text-white font-medium">
                            <Link
                                href="/dashboard"
                                className={`px-4 py-1.5 rounded-full transition ${pathname === "/dashboard"
                                    ? "bg-white/20 text-white shadow-sm"
                                    : "text-white/80 hover:bg-white/20 hover:text-white"
                                    }`}>
                                Menu
                            </Link>

                            <Link
                                href="/peta-pohon"
                                className={`px-4 py-1.5 rounded-full transition ${pathname === "/peta-pohon"
                                    ? "bg-white/20 text-white shadow-sm"
                                    : "text-white/80 hover:bg-white/20 hover:text-white"
                                    }`}>
                                Peta Pohon
                            </Link>
                        </div>

                    </div>

                </div>
            </header>

            {/* SIDEBAR */}
            <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex items-center justify-between p-4 border-b">
                    <Image src={logo} alt="Logo" width={120} height={60} />
                    <button onClick={() => setIsSidebarOpen(false)}>✕</button>
                </div>

                <nav className="p-6 space-y-4">
                    <SidebarLink href="/aset-gardu" icon={<IoIosBookmarks />} label="Aset Gardu" close={setIsSidebarOpen} />
                    <SidebarLink href="/aset-gh-gb-mc" icon={<IoMdBarcode />} label="Aset GH GB MC" close={setIsSidebarOpen} />
                    <SidebarLink href="/aset-jtm" icon={<IoMdOptions />} label="Aset JTM" close={setIsSidebarOpen} />
                    <SidebarLink href="/file-gd" icon={<IoIosFolder />} label="File GD" close={setIsSidebarOpen} />
                    <SidebarLink href="/file-jtm" icon={<IoIosFolderOpen />} label="File JTM" close={setIsSidebarOpen} />
                    <SidebarLink href="https://experience.arcgis.com/experience/3bd3e44d7b524c42b61a713f2aa33919" icon={<IoMapSharp />} label="Peta Resiko" close={setIsSidebarOpen} />

                    <hr />
                    <button onClick={handleLogoutClick} className="flex items-center gap-2 text-red-600">
                        <IoLogOutOutline /> Logout
                    </button>
                </nav>
            </div>

            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40" />}

            {/* MAIN */}
            <main className="w-full bg-white rounded-t-3xl mt-4 md:mt-0 lg:-mt-4 shadow-xl flex flex-col flex-1 min-h-0 relative z-10">

                {/* SEARCH MOBILE — FULL WIDTH */}
                <div className="md:hidden sticky top-0 z-50 bg-white px-4 py-4 rounded-t-3xl">
                    <div className="relative max-w-none">
                        <IoMdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            className="w-full pl-10 pr-4 py-2 rounded-full border"
                            onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* CONTENT WRAPPER */}
                <div className="w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col flex-1 min-h-0">

                    {/* GRID / EMPTY */}
                    <div className="flex-1 overflow-y-auto overscroll-contain pr-1 pb-16 min-h-full w-full max-w-7xl xl:max-w-none xl:px-12 mx-auto">

                        {filteredMenus.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 auto-rows-fr">
                                {filteredMenus.map(item => (
                                    <Link key={item.id} href={item.link}>
                                        <CardContent item={item} />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full min-h-full flex items-center justify-center">
                                <p className="text-gray-400 text-lg">Tidak ada menu</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

/* ==== COMPONENTS ==== */

function SidebarLink({ href, icon, label, close }: any) {
    return (
        <Link href={href} onClick={() => close(false)} className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
            {icon} {label}
        </Link>
    );
}

function CardContent({ item }: any) {
    return (
        <div className=" bg-gradient-to-r from-[#2FA6DE] to-[#225E65] text-white rounded-2xl p-3 sm:p-5 h-full flex flex-col transition-all duration-300 ease-out
            hover:scale-[1.01] hover:shadow-2xl cursor-pointer group">
            <div className="w-full aspect-square overflow-hidden rounded-xl mb-3 flex-shrink-0">
                <Image src={item.image} alt={item.title}
                    className="w-full h-full object-cover"/>
            </div>

            <h3 className="text-sm sm:text-base font-semibold text-center min-h-[36px] flex items-center justify-center">
                {item.title}
            </h3>
        </div>
    );
}