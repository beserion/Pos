import { useTheme } from 'next-themes';

export function useThemeTransition() {
    const { theme, setTheme } = useTheme();

    const toggleTheme = (e: React.MouseEvent) => {
        const isDark = theme === 'dark';
        const nextTheme = isDark ? 'light' : 'dark';

        // Tarayıcı View Transitions API'yi desteklemiyorsa normal geçiş yap
        if (!document.startViewTransition) {
            setTheme(nextTheme);
            return;
        }

        // Tıklanan noktanın koordinatları
        const x = e.clientX;
        const y = e.clientY;

        // Ekranın en uzak köşesine olan uzaklık (maksimum yarıçap)
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        const transitionClass = isDark ? 'theme-dark-to-light' : 'theme-light-to-dark';
        
        // Çakışmayı önlemek için geçici sınıf ekle (CSS geçişlerini kapatmak için)
        document.documentElement.classList.add('theme-transitioning');
        document.documentElement.classList.add(transitionClass);

        const transition = document.startViewTransition(() => {
            setTheme(nextTheme);
        });

        transition.ready.then(() => {
            // Animasyon dairesi
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`
            ];

            // Dark -> Light iken, dark temanın eski hali daralacak
            // Light -> Dark iken, dark temanın yeni hali büyüyecek
            document.documentElement.animate(
                {
                    clipPath: isDark ? [...clipPath].reverse() : clipPath,
                },
                {
                    duration: 500,
                    easing: "ease-in-out",
                    pseudoElement: isDark ? "::view-transition-old(root)" : "::view-transition-new(root)",
                    fill: "forwards"
                }
            );
        });

        transition.finished.then(() => {
            document.documentElement.classList.remove('theme-transitioning');
            document.documentElement.classList.remove(transitionClass);
        });
    };

    return { theme, toggleTheme, setTheme };
}
