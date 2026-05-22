export interface ModalConfig {
	title: string;
	component?: string; // Component name to render inside modal
	props?: Record<string, unknown>;
	closable?: boolean;
}
