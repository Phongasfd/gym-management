"use client";
import React, { useEffect, useState } from 'react';
import axiosClient from '@/lib/axios';
import styles from '@/styles/header.module.css';
import {useRouter} from 'next/navigation';

const navItems = [
    { id: 'hero', label: 'Home' },
    {id: 'features', label: 'Features'},
    { id: 'programs', label: 'Programs' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'contact', label: 'Contact' },
];

function Header(){
    const [active, setActive] = useState('hero');
    const [isLoggedIn, setLoggedIn] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const sections = navItems
            .map(i => document.getElementById(i.id))
            .filter(Boolean);  // Remove null elements
        if (!sections.length) return;

        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActive(entry.target.id);
                    }
                })
            },
            { root: null, threshold: 0.3 }  // Lower threshold for better detection
        );

        const checkAuth = async () => {
            try {
                // attempt token refresh first; ignore errors
                await axiosClient.get('/auth/refresh-token', { withCredentials: true }).catch(() => {});

                const res = await axiosClient.get('/auth/me', { withCredentials: true });

                if (res.status === 200) {
                    setLoggedIn(true);
                } else {
                    setLoggedIn(false);
                }
            } catch {
                setLoggedIn(false);
            }
            
        };

        checkAuth();

        sections.forEach(s => observer.observe(s));
        return () => observer.disconnect();
    }, [])

    function handleClick(e, id) {
        e.preventDefault();

        const ele = document.getElementById(id);
        if (ele) ele.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(id);

    }

    async function handleLogout() {
        await axiosClient.post('/auth/logout');

        setLoggedIn(false);
        router.push('/');
        router.refresh(); // refresh server components
    }


    return(
        <header className={styles.header}>
                    <div className="container">
                            <nav className={styles.navbar}>
                                    <a href="#hero" className={styles.logo} onClick={(e) => handleClick(e, 'hero')}>
                                            <span className={styles["logo-icon"]}>💪</span>
                                            <span className={styles["logo-text"]}>ELEVATE</span>
                                    </a>
                  
                                    <input type="checkbox" id="menu-toggle" className={styles["menu-toggle"]} />
                                    <label htmlFor="menu-toggle" className={styles["menu-button"]}>
                                            <span className={styles["menu-line"]}></span>
                                            <span className={styles["menu-line"]}></span>
                                            <span className={styles["menu-line"]}></span>
                                    </label>
                  
                                    <ul className={styles["nav-links"]}>
                                            {navItems.map(item => (
                                                <li key={item.id}>
                                                    <a
                                                        href={'#' + item.id}
                                                        onClick={(e) => handleClick(e, item.id)}
                                                        className={`${styles["nav-link"]} ${active === item.id ? styles.active : ''}`}
                                                    >{item.label}</a>
                                                </li>
                                            ))}
                                            
                                            {isLoggedIn ? (
                        
                                                <li><a onClick={handleLogout} className={`${styles["nav-link"]} ${styles["cta-nav"]}`}
                                                >Logout</a></li>
                                            ) :
                                            (
                                                <li><a href="/login" className={`${styles["nav-link"]} ${styles["cta-nav"]}`}
                                                >Login</a></li>
                                            )}
                                    </ul>
                            </nav>
                    </div>
            </header>
    );
}

export default Header