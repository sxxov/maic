declare const _: (config: { enabled?: boolean }) => {
    name: string;
    transform(src: string, id: string): string | null;
    resolveId(id: string): string | null;
    load(id: string): string | null;
} | null;
export default _;
