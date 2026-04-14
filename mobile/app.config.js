const path = require("path");

/* Carga siempre `mobile/.env` (mismo directorio que este archivo), no depende del cwd de la terminal. */
require("dotenv").config({ path: path.join(__dirname, ".env") });

const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      "expo-secure-store",
      "expo-image",
      [
        "expo-notifications",
        {
          color: "#6366f1",
          defaultChannel: "default",
          sounds: ["./assets/sounds/eduplay-push-chime.wav"],
        },
      ],
    ],
    extra: {
      ...(appJson.expo.extra ?? {}),
      viewerUserId: process.env.EXPO_PUBLIC_USER_ID?.trim() ?? "",
      parentUserId: process.env.EXPO_PUBLIC_PARENT_ID?.trim() ?? "",
      apiUrl: process.env.EXPO_PUBLIC_API_URL?.trim() ?? "",
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ?? "",
      },
    },
  },
};
