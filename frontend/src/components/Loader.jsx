import React from "react";
import { TailSpin } from "react-loader-spinner";

export default function Loader() {
  return (
    <div className="flex justify-center items-center h-full">
      <TailSpin
        height="80"
        width="80"
        color="#4f46e5"
        ariaLabel="tail-spin-loading"
        radius="1"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
      />
    </div>
  );
}
