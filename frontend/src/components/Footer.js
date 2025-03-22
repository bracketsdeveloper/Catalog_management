import React from 'react'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-tr 
          from-[#e2d6db] to-[#08080e] rounded-lg shadow m-4">
      <div className="w-full max-w-screen-xl mx-auto p-4 md:py-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <a
            href="/"
            className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse"
          >
            <img
              src=""
              className="h-8"
              alt=" Logo"
            />
            <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
              
            </span>
          </a>
          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-white sm:mb-0 dark:text-white">
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">
                About
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">
                Licensing
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <hr className="my-6 border-white sm:mx-auto dark:border-white lg:my-8" />
        <span className="block text-sm text-white sm:text-center dark:text-white">
          © 2023{' '}
          <a href="" className="hover:underline">
          </a>
          . All Rights Reserved.
        </span>
      </div>
    </footer>
  )
}
