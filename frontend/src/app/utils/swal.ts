import Swal from 'sweetalert2';

export const showSwal = (options: any) => {
    const isDarkMode = document.documentElement.classList.contains('dark');

    return Swal.fire({
        background: isDarkMode ? '#0f172a' : '#ffffff',
        color: isDarkMode ? '#f8fafc' : '#1e293b',
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b',
        customClass: {
            popup: 'rounded-[1rem] border border-slate-200 dark:border-slate-800 shadow-2xl',
            title: 'text-slate-800 dark:text-white font-bold',
            htmlContainer: 'text-slate-600 dark:text-slate-400',
            confirmButton: 'rounded-lg px-6 py-2.5 font-bold',
            cancelButton: 'rounded-lg px-6 py-2.5 font-bold'
        },
        ...options
    });
};

export const toastSwal = (options: any) => {
    const isDarkMode = document.documentElement.classList.contains('dark');

    return Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: isDarkMode ? '#1e293b' : '#ffffff',
        color: isDarkMode ? '#f8fafc' : '#1e293b',
        ...options
    }).fire();
};
