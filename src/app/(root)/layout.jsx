import React from 'react'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { onBoardUser } from '@/modules/auth/actions'

import Navbar from '@/modules/home/components/navbar'
import AppShell from '@/modules/app/components/app-shell'

// Signed-in users get the app (sidebar shell); visitors get the marketing site.
const layout = async ({ children }) => {
  await onBoardUser()
  const { userId } = await auth()

  if (userId) {
    const sidebarState = (await cookies()).get('sidebar_state')?.value
    return <AppShell defaultOpen={sidebarState !== 'false'}>{children}</AppShell>
  }

  return (
    <main className='flex flex-col min-h-screen relative overflow-x-hidden bg-background dark:bg-black'>
      <Navbar />
      <div className='flex-1 w-full mt-14'>
        {children}
      </div>
    </main>
  )
}

export default layout
