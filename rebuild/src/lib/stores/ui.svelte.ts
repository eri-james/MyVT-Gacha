import type { ModalConfig } from '$lib/types';

export type PageId = 'home' | 'collection' | 'gacha' | 'liveon' | 'liveon-setup' | 'toss' | 'quests' | 'settings';

export class UIStore {
        activePage: PageId = $state('home');
        modal: ModalConfig | null = $state(null);
        toasts: Array<{ id: number; message: string; type: 'success' | 'error' | 'info'; duration: number }> = $state([]);
        private _toastId = 0;

        navigate(page: PageId): void {
                this.activePage = page;
        }

        openModal(config: ModalConfig): void {
                this.modal = config;
        }

        closeModal(): void {
                this.modal = null;
        }

        showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000): void {
                const id = ++this._toastId;
                this.toasts.push({ id, message, type, duration });
                setTimeout(() => {
                        this.toasts = this.toasts.filter((t) => t.id !== id);
                }, duration);
        }
}

export const uiStore = new UIStore();
