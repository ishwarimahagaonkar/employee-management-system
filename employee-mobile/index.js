import { registerRootComponent } from 'expo';

// Defines the background travel-tracking task; must be imported in global
// scope so the task exists when the OS launches the app headless.
import './src/tasks/travelTracking';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
