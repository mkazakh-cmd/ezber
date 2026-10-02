import { render } from 'preact';
import { App } from './app';
import './styles.css';

render(<App />, document.getElementById('app')!);

// Kalıcı depolama iste: Android Chrome, kurulu uygulamada genelde sessizce onaylar
navigator.storage?.persist?.();
