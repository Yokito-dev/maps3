// 'use client';
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import Image from 'next/image';
// import { MdOutlineKeyboardArrowLeft } from "react-icons/md";
// import Link from 'next/link';
// import segitiga from '../assets/svgs/SegitigaSidebarKecil.svg';
// import Icon from '../assets/svgs/IconTelkomSchool.svg';
// import Daftar from '../assets/svgs/IconDaftarAktif.svg';
// import Orang from '../assets/svgs/LogoPengguna.svg';
// import statistik from '../assets/svgs/LogoStatistik.svg';
// import { FaTelegramPlane } from "react-icons/fa";
// import keluar from '../assets/svgs/LogoKeluar.svg';
// import Home from '../assets/svgs/LogoHomeAbu.svg';
// import { FaEdit } from "react-icons/fa";
// import { IoMdSearch } from "react-icons/io";
// import Swal from "sweetalert2";
// import { FaFileExcel } from "react-icons/fa";
// import * as XLSX from "xlsx";

// interface Tamu {
//   id: number;
//   nama_tamu: string;
//   instansi: string;
//   tujuan: string;
//   nama_yang_dikunjungi: string;
//   keperluan: string;
//   kartu_identitas: string;
//   nomor_identitas: string;
//   nomor_telepon: string;
//   status: string;
//   created_at: Date;
// }

// function Page() {
//   const [searchTerm, setSearchTerm] = useState<string>('');
//   const [guruData, setGuruData] = useState<Tamu[]>([]);
//   const [data, setData] = useState<Tamu[]>([]);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [guruRes] = await Promise.all([
//           axios.get("http://127.0.0.1:8000/api/gurus"),
//         ]);
//         setGuruData(guruRes.data);
//         setData([...guruRes.data]);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       }
//     };
//     fetchData();
//   }, []);

//   const filteredData = data.filter(tamu =>
//     tamu.nama_yang_dikunjungi.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     tamu.tujuan.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     tamu.keperluan.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     (tamu.created_at
//       ? new Date(tamu.created_at).toLocaleDateString("id-ID", {
//         weekday: "long",
//         day: "numeric",
//         month: "long",
//         year: "numeric",
//       }).toLowerCase().includes(searchTerm.toLowerCase())
//       : false)
//   );

//   // Fungsi untuk mengupdate status - diperbarui untuk menggunakan id
//   const handleStatusChange = async (id: number, newStatus: string, nama_tamu: string) => {
//     try {
//       console.log("Mengirim request update status:", { id, status: newStatus });
      
//       const response = await axios.put(
//         "http://127.0.0.1:8000/api/data/update-status",
//         {
//           id: id,  // Perbaikan: kirim ID bukan nomor_telepon
//           status: newStatus,
//         }
//       );
  
//       Swal.fire({
//         title: "Berhasil!",
//         text: `Status untuk ${nama_tamu} berhasil diubah menjadi ${newStatus}`,
//         icon: "success",
//         timer: 2000,
//       });
  
//       // Update status di state lokal berdasarkan ID
//       setData((prevData) =>
//         prevData.map((item) =>
//           item.id === id
//             ? { ...item, status: newStatus }
//             : item
//         )
//       );
//     } catch (error) {
//       let errorMessage = "Terjadi kesalahan saat mengupdate status.";
  
//       if (axios.isAxiosError(error) && error.response) {
//         errorMessage = error.response.data?.message || errorMessage;
//         console.error("API error response:", error.response.data);
//       } else if (error instanceof Error) {
//         errorMessage = error.message;
//       }
  
//       Swal.fire({
//         title: "Gagal Mengubah Status",
//         text: errorMessage,
//         icon: "error",
//       });
//     }
//   };

//   // Fungsi untuk menghapus data - diperbarui untuk menggunakan URL yang konsisten
//   const handleDelete = async (created_at: string, nama_tamu: string) => {
//     Swal.fire({
//       title: "Konfirmasi Hapus",
//       text: `Apakah Anda yakin ingin menghapus data tamu ${nama_tamu}?`,
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#d33",
//       cancelButtonColor: "#3085d6",
//       confirmButtonText: "Ya, Hapus!",
//       cancelButtonText: "Batal",
//     }).then(async (result) => {
//       if (result.isConfirmed) {
//         try {
//           const response = await axios.delete(
//             "http://127.0.0.1:8000/api/data/delete-by-created-at",
//             {
//               data: { created_at },
//             }
//           );

//           Swal.fire({
//             title: "Terhapus!",
//             text: response.data.message,
//             icon: "success",
//             timer: 2000,
//           });

//           setData((prevData) =>
//             prevData.filter((item) => item.created_at.toString() !== created_at)
//           );
//         } catch (error) {
//           let errorMessage = "Terjadi kesalahan saat menghapus data.";

//           if (axios.isAxiosError(error) && error.response) {
//             errorMessage = error.response.data?.message || errorMessage;
//           } else if (error instanceof Error) {
//             errorMessage = error.message;
//           }

//           Swal.fire({
//             title: "Gagal",
//             text: errorMessage,
//             icon: "error",
//           });
//         }
//       }
//     });
//   };

//   const downloadExcel = () => { 
//     const ws = XLSX.utils.json_to_sheet( 
//       filteredData.map((item) => {
//         const formattedDate = item.created_at
//           ? new Date(item.created_at).toLocaleDateString("id-ID", {
//               weekday: "long",
//               day: "numeric",
//               month: "long",
//               year: "numeric",
//             })
//           : "Tanggal tidak tersedia";
        
//         return {
//           nama_tamu: item.nama_tamu,
//           instansi: item.instansi,
//           tujuan: item.tujuan,
//           nama_yang_dikunjungi: item.nama_yang_dikunjungi,
//           keperluan: item.keperluan,
//           kartu_identitas: item.kartu_identitas,
//           nomor_identitas: item.nomor_identitas,
//           nomor_telepon: item.nomor_telepon,
//           status: item.status || "Pending",
//           tanggal: formattedDate
//         };
//       })
//     );
    
//     const wb = XLSX.utils.book_new(); 
//     XLSX.utils.book_append_sheet(wb, ws, "Daftar Tamu"); 
//     XLSX.writeFile(wb, "data_tamu_guru.xlsx"); 
//   };

//   return (
//     <div className='bg-[#EBEAF2] min-h-screen overflow-hidden'>
//       <div className='flex flex-row'>
//         <nav className='bg-[#BA272D] px-7 py-[359.9px]' style={{ borderRadius: "0px 20px 20px 0px" }}>
//           <Image src={Icon} alt='' width={50} className='absolute mt-[-300px] ml-[-27px]' />
//           <Image src={segitiga} alt='' className='absolute mt-[-300px] ml-[-27px]' />
//           <div className='absolute'>
//             <Link href='/dashboard'>
//               <div className='ml-[-22px] rounded-lg mt-[-160px] hover:bg-[#9C0006] p-[7px]'>
//                 <Image src={Home} alt='Home' width={30} />
//               </div>
//             </Link>
//             <Link href='/daftaradmin'>
//               <div className='ml-[-22px] rounded-lg mt-3 bg-[#9C0006] p-[7px]'>
//                 <Image src={Daftar} alt='Daftar' width={30} />
//               </div>
//             </Link>
//             <Link href='/statistik'>
//               <div className='ml-[-22px] rounded-lg mt-3 hover:bg-[#9C0006] p-[7px]'>
//                 <Image src={statistik} alt='Statistik' width={30} />
//               </div>
//             </Link>
//             <Link href='/aksespengguna'>
//               <div className='ml-[-22px] rounded-lg mt-3 hover:bg-[#9C0006] p-[7px]'>
//                 <Image src={Orang} alt='Akses Pengguna' width={30} />
//               </div>
//             </Link>
            
//             <Link href="/akuntelegram">
//               <div className='ml-[-20px] text-[#d28c8f] text-2xl rounded-lg mt-3 hover:bg-[#9C0006] p-[8px]'>
//                 <FaTelegramPlane />
//               </div>
//             </Link>

//             <Link href='/staf'>
//               <div className='ml-[-22px] rounded-lg mt-3 hover:bg-[#9C0006] p-[7px]'>
//                 <Image src={keluar} alt='Keluar' width={30} />
//               </div>
//             </Link>
//           </div>
//         </nav>

//         <div className="flex-1 px-4">
//           <div className='flex items-center justify-between mt-8'>
//             <Link href='/dashboard'>
//               <p className='flex text-[20px] items-center'>
//                 <MdOutlineKeyboardArrowLeft />
//                 <span className='text-lg font-semibold'>Daftar Tamu</span>
//               </p>
//               {/* Tombol Download Excel */}
//             <div className="flex items-center justify-between mt-[-30px] ml-[480px]">
//               <button
//                 onClick={downloadExcel}
//                 className="bg-[#1E7E34] text-white py-2 px-4 rounded-md flex items-center text-sm hover:bg-[#166329] transition-colors"
//               >
//                 <FaFileExcel className="mr-2" /> Unduh Data Excel
//               </button>
//             </div>
//             </Link>
//             <div className="relative flex items-center mr-10">
//               <IoMdSearch className="absolute left-3 text-gray-400" />
//               <input
//                 type='text'
//                 placeholder='Cari'
//                 className="pl-10 pr-5 py-1 rounded-full border border-gray-300 text-sm transition-all duration-300 focus:w-[250px] w-[200px] focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//           </div>

//           <div className='mt-10 flex flex-wrap justify-start gap-6 mb-4'>
//             {["Kepala Sekolah", "Perf. QMR", "Keuangan / Administrasi", "Kurikulum", "Kesiswaan", "Sarpra", "Hubin", "PPDB", "Guru"].map((label, idx) => {
//               let href = '';
//               let openInNewTab = false;
              
//               switch (label) {
//                 case "Kepala Sekolah":
//                   href = "/daftaradmin";
//                   break;
//                 case "Perf. QMR":
//                   href = "/Perf";
//                   break;
//                 case "Keuangan / Administrasi":
//                   href = "/keuangan";
//                   break;
//                 case "Kurikulum":
//                   href = "/kurikulum";
//                   break;
//                 case "Kesiswaan":
//                   href = "/kesiswaan";
//                   break;
//                 case "Sarpra":
//                   href = "/sarpra";
//                   break;
//                 case "Hubin":
//                   href = "/hubin";
//                   break;
//                 case "PPDB":
//                   href = "/ppdb";
//                   break;
//                 default:
//                   href = "#";
//               }
//               return (
//                 label === "Guru" ? (
//                   <button 
//                     key={idx}
//                     disabled
//                     className="px-[14px] py-2 font-medium bg-red-600 text-white rounded-full text-sm mx-1"
//                   >
//                     {label}
//                   </button>
//                 ) : (
//                   <Link key={idx} href={href} target={openInNewTab ? "_blank" : "_self"}>
//                     <button className="px-[14px] py-2 font-medium hover:text-red-600 text-sm mx-1">
//                       {label}
//                     </button>
//                   </Link>
//                 )
//               );
//             })}
//           </div>

//           <div className='mt-8px overflow-x-auto'>
//             <table className='w-full' style={{ borderCollapse: "collapse" }}>
//               <thead style={{ backgroundColor: "#E3E2EC" }}>
//                 <tr className="border-[#EBEAF2] border-2 rounded-3xl">
//                   <th style={{ borderRadius: "20px 0px 0px 0px", padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Nama</th>
//                   <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Hari / Tanggal</th>
//                   <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Tujuan</th>
//                   <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Nama Yang Dikunjungi</th>
//                   <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Keperluan</th>
//                   <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Kartu Identitas</th>
//                   <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Nomor Identitas</th>
//                   <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Nomor Telepon</th>
//                   <th style={{ padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Status</th>
//                   <th style={{ borderRadius: "0px 20px 0px 0px", padding: "12px 10px", textAlign: "left", fontSize: "0.75rem" }}>Aksi</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredData.length > 0 ? (
//                   filteredData.map((item, index) => (
//                     <tr key={index} className="bg-white border-2">
//                       <td className='font-medium' style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem" }}>
//                         {item.nama_tamu}<br />
//                         <span className='text-gray-400' style={{ fontSize: "0.65rem" }}>{item.instansi}</span>
//                       </td>
//                       <td style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem" }}>
//                         {item.created_at
//                           ? new Date(item.created_at).toLocaleDateString("id-ID", {
//                             weekday: "long",
//                             day: "numeric",
//                             month: "long",
//                             year: "numeric",
//                           })
//                           : "Tanggal tidak tersedia"}
//                       </td>
//                       <td style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem", maxWidth: "100px", wordBreak: "break-word" }}>{item.tujuan}</td>
//                       <td style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem", maxWidth: "100px", wordBreak: "break-word" }}>{item.nama_yang_dikunjungi}</td>
//                       <td style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem", maxWidth: "100px", wordBreak: "break-word" }}>{item.keperluan}</td>
//                       <td style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem" }}>{item.kartu_identitas}</td>
//                       <td style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem" }}>{item.nomor_identitas}</td>
//                       <td style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem" }}>{item.nomor_telepon}</td>
//                       <td style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem" }}>
//                         <select
//                           value={item.status || "Pending"}
//                           onChange={(e) => handleStatusChange(item.id, e.target.value, item.nama_tamu)}
//                           className="border px-2 py-1 rounded text-xs w-full max-w-[90px]"
//                           style={{
//                             backgroundColor:
//                               item.status === "Pending" || !item.status ? "#FFF7E6" :
//                                 item.status === "Selesai" ? "#E6FFE6" :
//                                   item.status === "Batal" ? "#FFE6E6" :
//                                     "#FFFFFF",
//                             color:
//                               item.status === "Pending" || !item.status ? "#FF9900" :
//                                 item.status === "Selesai" ? "#00CC00" :
//                                   item.status === "Batal" ? "#FF0000" :
//                                     "#666666"
//                           }}
//                         >
//                           <option value="Pending" className="text-[#FF9900] bg-white font-medium">Pending</option>
//                           <option value="Selesai" className="text-[#00CC00] bg-white font-medium">Selesai</option>
//                           <option value="Batal" className="text-[#FF0000] bg-white font-medium">Batal</option>
//                         </select>
//                       </td>
//                       <td style={{ padding: "10px", textAlign: "left", fontSize: "0.7rem" }}>
//                         <div className="flex space-x-1">
//                           <Link href={`/editDataGuru/${item.id}`}>
//                             <button
//                               className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-700 transition duration-200 flex items-center text-xs"
//                             >
//                               <FaEdit className="mr-1" size={10} /> Edit
//                             </button>
//                           </Link>
//                           <button
//                             onClick={() => handleDelete(item.created_at.toString(), item.nama_tamu)}
//                             className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700 transition duration-200 text-xs"
//                           >
//                             Hapus
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan={10} className="text-center py-4 text-sm">
//                       Tidak ada data yang ditemukan
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Page;
