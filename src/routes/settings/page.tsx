import React from 'react'
import {motion} from "motion/react"
import SettingsSidebar from './SettingsSidebar'
import { Outlet } from 'react-router-dom'


const Settings = () => {
  return (
    <div className='size-full flex '>
      <SettingsSidebar />
      <Outlet />
    </div>
  )
}

export  {Settings}