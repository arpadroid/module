// Replace your-framework with the framework you are using, e.g. react-vite, nextjs, nextjs-vite, etc.
import { setProjectAnnotations } from '@storybook/web-components-vite';
import * as previewAnnotations from './preview';
setProjectAnnotations([previewAnnotations]);
