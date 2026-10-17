import React from 'react'
import { onBoardUser } from '@/modules/auth/actions'

import Navbar from '@/modules/home/components/navbar'
const layout =async ({children}) => {
  await onBoardUser()
  return (
    <main className='flex flex-col min-h-screen relative overflow-x-hidden bg-background'>
      <Navbar />
      <div className='flex-1 w-full mt-14'>
        {children}
      </div>
    </main>
  )
}



export default layout
