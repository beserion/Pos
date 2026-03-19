import Swal from 'sweetalert2';

export const showSwal = (options: any) => {
    return Swal.fire({
        background: 'transparent',
        customClass: {
            popup: '!bg-white dark:!bg-slate-900 !rounded-[32px] border border-slate-200 dark:border-indigo-600/30 shadow-2xl shadow-indigo-500/10 dark:!shadow-[0_40px_120px_-20px_rgba(79,70,229,0.45)]',
            title: '!text-slate-800 dark:!text-white font-extrabold text-2xl tracking-tight',
            htmlContainer: '!text-slate-500 dark:!text-slate-400 font-medium text-sm mt-2',
            icon: '!border-white dark:!border-slate-800',
            confirmButton: 'bg-indigo-600 hover:bg-indigo-700 !text-white rounded-xl px-8 py-3.5 font-bold shadow-md shadow-indigo-500/20 transition-all',
            denyButton:    'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 !text-slate-700 dark:!text-slate-200 rounded-xl px-8 py-3.5 font-bold transition-all',
            cancelButton:  'bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 !text-rose-600 dark:!text-rose-400 rounded-xl px-8 py-3.5 font-bold transition-all border border-rose-200 dark:border-rose-500/30',
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
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
            container: '!z-[10000]',
            popup: '!bg-white dark:!bg-slate-900 border border-slate-200 dark:border-slate-700 border-l-4 !border-l-amber-500 shadow-xl shadow-slate-900/10 !rounded-2xl',
            title: '!text-slate-800 dark:!text-white font-bold text-sm tracking-tight',
            htmlContainer: '!text-slate-500 dark:!text-slate-400 font-medium text-xs',
            timerProgressBar: 'bg-amber-500'
        },
        ...options
    }).fire();
};
