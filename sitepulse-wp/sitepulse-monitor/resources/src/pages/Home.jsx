import { useEffect, useState } from 'react'
import {
    ToggleControl,
    Button,
    Notice,
    TabPanel,
    __experimentalNumberControl as NumberControl,
} from '@wordpress/components'
import { __, sprintf } from '@wordpress/i18n'
import Switch from '../components/Switch'
import PageHeader from '../components/PageHeader'
import Layout from '../components/Layout'

const Home = () => {
    return (
        <Layout>
            <h1>Home</h1>
        </Layout>
    )
}

export default Home
