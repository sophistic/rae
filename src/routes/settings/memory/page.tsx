import ConnectX from '@/components/misc/ConnectX'
import { useUserStore } from '@/store/userStore'
import React from 'react'

const Memory = () => {
    const {email} = useUserStore()
  return (
    <div><ConnectX
        provider="google-drive" // or "google-drive" / "one-drive"
        email={email}
      /></div>
  )
}

export default Memory