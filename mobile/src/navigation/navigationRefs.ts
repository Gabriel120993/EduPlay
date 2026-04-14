import { createNavigationContainerRef } from "@react-navigation/native";

import type { ParentStackParamList, RootStackParamList } from "./types";

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();
export const parentNavigationRef = createNavigationContainerRef<ParentStackParamList>();
