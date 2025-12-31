import { AbilityBuilder, createMongoAbility } from "@casl/ability";

/*
  Policy:
  admin=> any CRUD
  user=> C(own by jwt), R(any), U(own), D(own)
  unknown role=> NO permissions
*/
export function defineAbilityFor(user) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  const role = user?.role; 

  // Admin policy
  if (role === "admin") {
    can("manage", "all");
    return build({
      detectSubjectType: (item) => item.__caslSubjectType__,
    });
  }

  // User policy
  if (role === "user") {
    
    // user can read any
    can("read", "all");

    // Models where ownership field is "owner"
    const subjects = ["Video", "Tweet", "Playlist", "Comment"];

    for (const subject of subjects) {
    can("create", subject);
    can(["update", "delete"], subject, { owner: user._id });
    }


    // Like model (ownership field is "likedBy")
    can("create", "Like");
    can("delete", "Like", { likedBy: user._id });

    // Subscription model (ownership field is "subscriber")
    can("create", "Subscription");
    can("delete", "Subscription", { subscriber: user._id });

    return build({
      detectSubjectType: (item) => item.__caslSubjectType__,
    });
  }

  // Unknown role => no permissions at all
  return build({
    detectSubjectType: (item) => item.__caslSubjectType__,
  });
}