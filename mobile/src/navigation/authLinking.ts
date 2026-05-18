import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';

import type { AuthStackParamList } from './types';

const appPrefix = Linking.createURL('/');

export const authLinking: LinkingOptions<AuthStackParamList> = {
  prefixes: [appPrefix, 'http://localhost:8081', 'https://app.eduplay.app'],
  config: {
    screens: {
      AuthHome: 'login',
      ParentRegister: 'register',
      MinorLogin: 'minor-login',
      LegalDocument: 'legal/:kind',
    },
  },
};
