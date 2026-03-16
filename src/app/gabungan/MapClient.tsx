"use client";

import dynamic from "next/dynamic";

const LeafletCanvas = dynamic(() => import("./LeafletCanvas"), {
  ssr: false,
});

export default function MapClient() {
  return <LeafletCanvas />;
}