import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'web',plugins:[react()],server:{fs:{allow:['..']}},build:{outDir:'../dist',emptyOutDir:true},test:{include:['packages/**/*.test.ts','tools/**/*.test.ts']}});
