import Swal from 'sweetalert2';

export const showSwal = (options: any) => {
    return Swal.fire({
        customClass: {
            popup: '!bg-white dark:!bg-slate-900 !rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-500/10',
            title: '!text-slate-800 dark:!text-white font-extrabold text-2xl tracking-tight',
            htmlContainer: '!text-slate-500 dark:!text-slate-400 font-medium text-sm mt-2',
            icon: '!border-white dark:!border-slate-800',
            confirmButton: 'bg-indigo-600 hover:bg-indigo-700 !text-white rounded-xl px-8 py-3.5 font-bold shadow-md shadow-indigo-500/20 transition-all',
            cancelButton: 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 !text-slate-600 dark:!text-slate-300 rounded-xl px-8 py-3.5 font-bold transition-all',
            actions: 'gap-3 w-full mt-6',
        },
        buttonsStyling: false,
        backdrop: 'rgba(15, 23, 42, 0.6)',
        ...options
    });
};

export const toastSwal = (options: any) => {
    return Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
            popup: '!bg-white dark:!bg-slate-900 border border-slate-200 dark:border-slate-700 border-l-4 !border-l-indigo-500 shadow-xl shadow-slate-900/10 !rounded-2xl',
            title: '!text-slate-800 dark:!text-white font-bold text-sm tracking-tight',
            htmlContainer: '!text-slate-500 dark:!text-slate-400 font-medium text-xs',
            timerProgressBar: 'bg-indigo-500'
        },
        ...options
    }).fire();
};
