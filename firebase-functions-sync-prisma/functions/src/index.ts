import "dotenv/config";


import {
  handleUserSignup,
  handleUserDeletion,
} from "./authSync";

import {
  syncLeaderboardCreate,
  syncLeaderboardUpdate,
  syncLeaderboardDelete,
} from "./firestoreSync";

export {
  handleUserSignup,
  handleUserDeletion,
  syncLeaderboardCreate,
  syncLeaderboardUpdate,
  syncLeaderboardDelete,
};
