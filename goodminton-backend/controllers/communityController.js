/**
 * @file controllers/communityController.js
 * @description Business logic for managing communities
 */
const mongoose = require("mongoose");
const Community = require("../models/Community");
const CommunityEvent = require("../models/CommunityEvent");
const CommunityEventRsvp = require("../models/CommunityEventRsvp");
const CommunityMember = require("../models/CommunityMember");
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const uploadBufferToCloudinary = require("../utils/cloudinaryUpload");

const CLOUDINARY_COVER_FOLDER = "goodminton/community-covers";

const COMMUNITY_FIELD_CATALOG = {
  community: [
    { key: "id", type: "string", description: "Unique community identifier" },
    { key: "name", type: "string", description: "Display name" },
    { key: "slug", type: "string", description: "URL-safe identifier" },
    { key: "description", type: "string", description: "Community summary" },
    {
      key: "coverImageUrl",
      type: "string|null",
      description: "Hero image URL",
    },
    {
      key: "visibility",
      type: "'public'|'private'",
      description: "Controls discoverability",
    },
    {
      key: "joinPolicy",
      type: "'auto'|'approval'",
      description: "How members join",
    },
    { key: "memberCount", type: "number", description: "Active member total" },
    { key: "eventCount", type: "number", description: "Total events created" },
    { key: "postCount", type: "number", description: "Total posts created" },
    {
      key: "lastActivityAt",
      type: "ISO date",
      description: "Last content timestamp",
    },
    { key: "creator", type: "object", description: "Creator metadata" },
    { key: "createdAt", type: "ISO date", description: "Creation timestamp" },
    {
      key: "updatedAt",
      type: "ISO date",
      description: "Last update timestamp",
    },
  ],
  membership: [
    {
      key: "role",
      type: "'owner'|'admin'|'member'",
      description: "Permission level",
    },
    {
      key: "status",
      type: "'active'|'pending'|'banned'",
      description: "Membership state",
    },
    { key: "joinedAt", type: "ISO date", description: "Join date" },
  ],
  event: [
    { key: "title", type: "string", description: "Event headline" },
    { key: "description", type: "string", description: "Event details" },
    { key: "location", type: "string", description: "Venue or link" },
    { key: "startAt", type: "ISO date", description: "Start time" },
    { key: "endAt", type: "ISO date", description: "End time" },
    { key: "rsvpLimit", type: "number", description: "Maximum attendees" },
    {
      key: "visibility",
      type: "'community'|'public'",
      description: "Event visibility",
    },
  ],
  post: [
    { key: "content", type: "string", description: "Post body" },
    { key: "mediaUrls", type: "string[]", description: "Attached media" },
    {
      key: "visibility",
      type: "'community'|'public'",
      description: "Post visibility",
    },
  ],
};

/**
 * Build a Mongo filter that accepts either a Mongo ObjectId or a slug string
 * @param {string} identifier
 * @returns {object}
 */
const resolveCommunityFilter = (identifier = "") =>
  mongoose.Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { slug: identifier.toLowerCase() };

/**
 * Normalize a string into a URL-safe slug
 * @param {string} value
 * @returns {string}
 */
const normalizeToSlug = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Ensure slug uniqueness by appending a numeric suffix if needed
 * @param {string} baseSlug
 * @returns {Promise<string>}
 */
const resolveUniqueSlug = async (baseSlug) => {
  let uniqueSlug = baseSlug;
  let suffix = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await Community.exists({ slug: uniqueSlug })) {
    uniqueSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return uniqueSlug;
};

/**
 * Project the community document into a frontend friendly payload
 * @param {import("mongoose").LeanDocument<any> | import("mongoose").Document} communityDoc
 * @returns {object}
 */
const mapCommunityPayload = (communityDoc) => {
  if (!communityDoc) {
    return null;
  }

  const creator = communityDoc.creator || {};

  return {
    id: communityDoc._id?.toString(),
    name: communityDoc.name,
    slug: communityDoc.slug,
    description: communityDoc.description,
    coverImageUrl: communityDoc.coverImageUrl,
    visibility: communityDoc.visibility,
    joinPolicy: communityDoc.joinPolicy,
    memberCount: communityDoc.memberCount,
    eventCount: communityDoc.eventCount,
    postCount: communityDoc.postCount,
    lastActivityAt: communityDoc.lastActivityAt,
    creator: creator
      ? {
          id: creator._id?.toString(),
          displayName: creator.profile?.displayName || null,
          avatar: creator.profile?.avatar || null,
        }
      : null,
    createdAt: communityDoc.createdAt,
    updatedAt: communityDoc.updatedAt,
  };
};

/**
 * Format membership data for responses
 * @param {import("mongoose").LeanDocument<any> | import("mongoose").Document | null} membership
 * @returns {object|null}
 */
const mapMembershipPayload = (membership) => {
  if (!membership) {
    return null;
  }

  return {
    id:
      typeof membership._id === "string"
        ? membership._id
        : membership._id?.toString(),
    userId:
      typeof membership.user === "string"
        ? membership.user
        : membership.user?.toString(),
    role: membership.role,
    status: membership.status,
    joinedAt: membership.joinedAt,
  };
};

/**
 * Normalize an event document into an API payload
 * @param {import("mongoose").Document | import("mongoose").LeanDocument<any> | null} eventDoc
 * @returns {object|null}
 */
const mapEventPayload = (eventDoc, extras = {}) => {
  if (!eventDoc) {
    return null;
  }

  const resolveId = (value) => {
    if (!value) {
      return null;
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value.toString === "function") {
      return value.toString();
    }
    return null;
  };

  const creator = eventDoc.createdBy || null;
  const creatorPayload =
    creator && typeof creator === "object"
      ? {
          id: resolveId(creator._id || creator),
          displayName: creator.profile?.displayName || null,
          avatar: creator.profile?.avatar || null,
        }
      : creator
      ? { id: resolveId(creator) }
      : null;

  return {
    id: resolveId(eventDoc._id),
    communityId: resolveId(eventDoc.community),
    title: eventDoc.title,
    description: eventDoc.description,
    location: eventDoc.location,
    startAt: eventDoc.startAt,
    endAt: eventDoc.endAt,
    rsvpLimit: eventDoc.rsvpLimit,
    visibility: eventDoc.visibility,
    createdBy: creatorPayload,
    createdAt: eventDoc.createdAt,
    updatedAt: eventDoc.updatedAt,
    ...extras,
  };
};

/**
 * Fetch a community document along with the requester's membership (if any)
 * @param {string} identifier
 * @param {string|null} userId
 * @returns {Promise<{community: import("mongoose").Document|null, membership: import("mongoose").Document|null, isCreator: boolean}>}
 */
const fetchCommunityContext = async (identifier, userId) => {
  const community = await Community.findOne(resolveCommunityFilter(identifier));

  if (!community) {
    return { community: null, membership: null, isCreator: false };
  }

  if (!userId) {
    return { community, membership: null, isCreator: false };
  }

  const membership = await CommunityMember.findOne({
    community: community._id,
    user: userId,
  })
    .select("role status joinedAt")
    .lean();

  const creatorId =
    typeof community.creator === "string"
      ? community.creator
      : community.creator?.toString();

  return { community, membership, isCreator: creatorId === userId };
};

/**
 * Resolve event context ensuring it belongs to the requested community
 * @param {string} identifier
 * @param {string} eventId
 * @param {string|null} userId
 * @returns {Promise<{community: any, membership: any, isCreator: boolean, event: any}>}
 */
const resolveEventContext = async (identifier, eventId, userId) => {
  const context = await fetchCommunityContext(identifier, userId);
  if (!context.community) {
    return { ...context, event: null };
  }

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return { ...context, event: null };
  }

  const event = await CommunityEvent.findById(eventId);
  if (!event) {
    return { ...context, event: null };
  }

  const communityId = context.community._id?.toString();
  const eventCommunityId = event.community?.toString();

  if (communityId !== eventCommunityId) {
    return { ...context, event: null };
  }

  return { ...context, event };
};

/**
 * Fetch all communities where the authenticated user has an active membership.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getUserCommunities = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Unauthorized. Please log in." });
    }

    const membershipDocs = await CommunityMember.find({
      user: userId,
      status: "active",
    })
      .populate({
        path: "community",
        select:
          "name slug description coverImageUrl visibility joinPolicy memberCount creator lastActivityAt createdAt updatedAt",
        populate: {
          path: "creator",
          select: "profile.displayName profile.avatar",
        },
      })
      .sort({ joinedAt: -1 })
      .lean();

    const communities = membershipDocs
      .filter((membership) => Boolean(membership.community))
      .map((membership) => ({
        ...mapCommunityPayload(membership.community),
        membership: mapMembershipPayload(membership),
      }));

    return res.status(200).json({
      success: true,
      communities,
      fields: COMMUNITY_FIELD_CATALOG,
    });
  } catch (error) {
    console.error("Get user communities error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load communities.",
    });
  }
};

/**
 * Create a new community and bootstrap the owner's membership
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const createCommunity = async (req, res) => {
  try {
    const { name, slug, description, coverImageUrl, visibility } = req.body;
    const creatorId = req.user?.userId;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Community name is required." });
    }

    const normalizedName = name.trim();
    if (normalizedName.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Community name must be at least 3 characters long.",
      });
    }

    const requestedVisibility = visibility === "private" ? "private" : "public";
    const slugCandidate = slug?.trim() || normalizedName;
    const normalizedSlug = normalizeToSlug(slugCandidate);

    if (!normalizedSlug) {
      return res.status(400).json({
        success: false,
        error: "Unable to derive a slug from the provided value.",
      });
    }

    const uniqueSlug = await resolveUniqueSlug(normalizedSlug);

    const community = await Community.create({
      name: normalizedName,
      slug: uniqueSlug,
      description: description?.trim() || "",
      coverImageUrl: coverImageUrl?.trim() || null,
      visibility: requestedVisibility,
      joinPolicy: requestedVisibility === "private" ? "approval" : "auto",
      creator: creatorId,
      memberCount: 1,
      lastActivityAt: new Date(),
    });

    const membership = await CommunityMember.create({
      community: community._id,
      user: creatorId,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
    });

    await community.populate("creator", "profile.displayName profile.avatar");

    return res.status(201).json({
      success: true,
      message: "Community created successfully.",
      community: mapCommunityPayload(community),
      membership: mapMembershipPayload(membership),
      fields: COMMUNITY_FIELD_CATALOG,
    });
  } catch (error) {
    console.error("Create community error:", error);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, error: "Community slug already exists." });
    }
    return res
      .status(500)
      .json({ success: false, error: "Failed to create community." });
  }
};

/**
 * Return the list of current admins/owner for a community
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const listCommunityAdmins = async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user?.userId || null;

    const { community, membership, isCreator } = await fetchCommunityContext(
      identifier,
      userId
    );

    if (!community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found." });
    }

    const isActiveAdmin =
      isCreator ||
      (membership?.status === "active" &&
        ["owner", "admin"].includes(membership?.role || ""));

    if (!isActiveAdmin) {
      return res.status(403).json({
        success: false,
        error: "Only admins can view the admin roster.",
      });
    }

    const adminMembers = await CommunityMember.find({
      community: community._id,
      status: "active",
      role: { $in: ["owner", "admin"] },
    })
      .populate("user", "profile.displayName profile.avatar email")
      .sort({ role: -1, joinedAt: 1 })
      .lean();

    const admins = adminMembers.map((entry) => {
      const userDoc = entry.user || {};
      return {
        id: userDoc._id?.toString() || entry.user?.toString() || null,
        role: entry.role,
        displayName:
          userDoc.profile?.displayName || userDoc.email || "Goodminton player",
        email: userDoc.email || null,
        avatar: userDoc.profile?.avatar || null,
      };
    });

    return res.status(200).json({ success: true, admins });
  } catch (error) {
    console.error("List community admins error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load community admins.",
    });
  }
};

/**
 * Permanently delete a community (owner only)
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const deleteCommunity = async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user?.userId || null;

    const { community, membership, isCreator } = await fetchCommunityContext(
      identifier,
      userId
    );

    if (!community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found." });
    }

    const isOwner =
      isCreator ||
      (membership?.status === "active" && membership?.role === "owner");

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: "Only the community owner can delete this community.",
      });
    }

    const communityId = community._id;
    const [eventIds, postIds] = await Promise.all([
      CommunityEvent.find({ community: communityId }).distinct("_id").lean(),
      Post.find({ community: communityId }).distinct("_id").lean(),
    ]);

    const deletions = [
      CommunityMember.deleteMany({ community: communityId }),
      CommunityEvent.deleteMany({ community: communityId }),
      Post.deleteMany({ community: communityId }),
    ];

    if (eventIds.length) {
      deletions.push(
        CommunityEventRsvp.deleteMany({ event: { $in: eventIds } })
      );
    }

    if (postIds.length) {
      deletions.push(Comment.deleteMany({ post: { $in: postIds } }));
    }

    await Promise.all(deletions);
    await Community.findByIdAndDelete(communityId);

    return res.status(200).json({
      success: true,
      message: "Community deleted successfully.",
    });
  } catch (error) {
    console.error("Delete community error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to delete community." });
  }
};

/**
 * Update mutable community properties (owner/admin access only)
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const updateCommunity = async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user?.userId || null;

    const { community, membership, isCreator } = await fetchCommunityContext(
      identifier,
      userId
    );

    if (!community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found." });
    }

    const isActiveAdmin =
      membership?.status === "active" &&
      ["owner", "admin"].includes(membership?.role || "");
    if (!isCreator && !isActiveAdmin) {
      return res.status(403).json({
        success: false,
        error: "Only admins can update community details.",
      });
    }

    const updates = {};
    const { name, slug, description, coverImageUrl, visibility } =
      req.body || {};

    if (typeof name === "string") {
      const trimmedName = name.trim();
      if (trimmedName.length < 3) {
        return res.status(400).json({
          success: false,
          error: "Community name must be at least 3 characters long.",
        });
      }
      updates.name = trimmedName;
    }

    if (typeof slug === "string") {
      const normalizedSlug = normalizeToSlug(slug);
      if (!normalizedSlug) {
        return res.status(400).json({
          success: false,
          error: "Unable to derive a slug from the provided value.",
        });
      }
      if (normalizedSlug !== community.slug) {
        updates.slug = await resolveUniqueSlug(normalizedSlug);
      }
    }

    if (description !== undefined) {
      updates.description =
        typeof description === "string" ? description.trim() : "";
    }

    if (coverImageUrl !== undefined) {
      const trimmedCover =
        typeof coverImageUrl === "string" ? coverImageUrl.trim() : "";
      updates.coverImageUrl = trimmedCover || null;
    }

    if (visibility !== undefined) {
      const normalizedVisibility =
        visibility === "private" ? "private" : "public";
      updates.visibility = normalizedVisibility;
      updates.joinPolicy =
        normalizedVisibility === "private" ? "approval" : "auto";
    }

    Object.entries(updates).forEach(([key, value]) => {
      community[key] = value;
    });

    community.updatedAt = new Date();
    await community.save();
    await community.populate("creator", "profile.displayName profile.avatar");

    return res.status(200).json({
      success: true,
      community: mapCommunityPayload(community),
      membership: mapMembershipPayload(membership),
      fields: COMMUNITY_FIELD_CATALOG,
    });
  } catch (error) {
    console.error("Update community error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update community." });
  }
};

/**
 * Create a community event respecting membership and visibility rules
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const createCommunityEvent = async (req, res) => {
  try {
    const { identifier } = req.params;
    const {
      title,
      description = "",
      location = "",
      startAt,
      endAt,
      rsvpLimit = 0,
      visibility = "community",
    } = req.body || {};
    const creatorId = req.user?.userId;

    if (!creatorId) {
      return res
        .status(401)
        .json({ success: false, error: "Please log in to create events." });
    }

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    const trimmedDescription =
      typeof description === "string" ? description.trim() : "";
    const trimmedLocation = typeof location === "string" ? location.trim() : "";

    if (!trimmedTitle) {
      return res
        .status(400)
        .json({ success: false, error: "Event title is required." });
    }

    if (!startAt || !endAt) {
      return res.status(400).json({
        success: false,
        error: "Start and end times are required.",
      });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Start and end times must be valid ISO dates.",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        error: "End time must be after the start time.",
      });
    }

    const numericRsvpLimit =
      typeof rsvpLimit === "number"
        ? rsvpLimit
        : rsvpLimit
        ? parseInt(rsvpLimit, 10)
        : 0;

    if (Number.isNaN(numericRsvpLimit) || numericRsvpLimit < 0) {
      return res.status(400).json({
        success: false,
        error: "RSVP limit must be a positive number.",
      });
    }

    let normalizedVisibility = visibility === "public" ? "public" : "community";

    const { community, membership, isCreator } = await fetchCommunityContext(
      identifier,
      creatorId
    );

    if (!community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found." });
    }

    const isActiveMember = membership?.status === "active";
    const isBannedMember = membership?.status === "banned";
    const isPrivateCommunity = community.visibility === "private";

    if (isBannedMember) {
      return res.status(403).json({
        success: false,
        error: "You are not permitted to create events in this community.",
      });
    }

    if (!isActiveMember && !isCreator) {
      return res.status(403).json({
        success: false,
        error: "Membership is required to create events.",
      });
    }

    if (isPrivateCommunity || !isCreator) {
      normalizedVisibility = "community";
    }

    const event = await CommunityEvent.create({
      community: community._id,
      title: trimmedTitle,
      description: trimmedDescription,
      location: trimmedLocation,
      startAt: startDate,
      endAt: endDate,
      rsvpLimit: numericRsvpLimit,
      visibility: normalizedVisibility,
      createdBy: creatorId,
    });

    await event.populate("createdBy", "profile.displayName profile.avatar");

    await Community.findByIdAndUpdate(community._id, {
      $inc: { eventCount: 1 },
      $set: { lastActivityAt: new Date() },
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully.",
      event: mapEventPayload(event, { attendeeCount: 0 }),
      fields: COMMUNITY_FIELD_CATALOG,
    });
  } catch (error) {
    console.error("Create community event error:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ success: false, error: error.message || "Invalid payload." });
    }
    return res.status(500).json({
      success: false,
      error: "Failed to create community event.",
    });
  }
};

/**
 * Retrieve events scoped to a community honoring visibility rules
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getCommunityEvents = async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user?.userId || null;

    const { community, membership, isCreator } = await fetchCommunityContext(
      identifier,
      userId
    );

    if (!community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found." });
    }

    const isActiveMember = membership?.status === "active";
    const isPrivateCommunity = community.visibility === "private";

    if (isPrivateCommunity && !isActiveMember && !isCreator) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Community is private.",
      });
    }

    const events = await CommunityEvent.find({ community: community._id })
      .sort({ startAt: 1 })
      .populate("createdBy", "profile.displayName profile.avatar")
      .lean();

    const eventIds = events.map((event) => event._id);
    const attendeeCounts = new Map();

    if (eventIds.length > 0) {
      const counts = await CommunityEventRsvp.aggregate([
        {
          $match: {
            event: { $in: eventIds },
          },
        },
        {
          $group: {
            _id: "$event",
            count: { $sum: 1 },
          },
        },
      ]);

      counts.forEach((entry) => {
        attendeeCounts.set(entry._id.toString(), entry.count);
      });
    }

    return res.status(200).json({
      success: true,
      events: events.map((eventDoc) =>
        mapEventPayload(eventDoc, {
          attendeeCount: attendeeCounts.get(eventDoc._id.toString()) || 0,
        })
      ),
    });
  } catch (error) {
    console.error("Get community events error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load community events.",
    });
  }
};

/**
 * RSVP to an event (public events allow any authenticated user, community events require membership)
 */
const rsvpForEvent = async (req, res) => {
  try {
    const { identifier, eventId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Please log in to RSVP." });
    }

    const { community, membership, isCreator, event } =
      await resolveEventContext(identifier, eventId, userId);

    if (!community || !event) {
      return res
        .status(404)
        .json({ success: false, error: "Event not found." });
    }

    const requiresMembership = event.visibility === "community";
    const isActiveMember = membership?.status === "active";

    if (requiresMembership && !isActiveMember && !isCreator) {
      return res.status(403).json({
        success: false,
        error: "Only community members can RSVP to this event.",
      });
    }

    const existing = await CommunityEventRsvp.findOne({
      event: event._id,
      user: userId,
    });

    if (existing) {
      const attendeeCount = await CommunityEventRsvp.countDocuments({
        event: event._id,
      });
      return res.status(200).json({
        success: true,
        message: "You have already RSVP'd for this event.",
        attendeeCount,
      });
    }

    if (event.rsvpLimit && event.rsvpLimit > 0) {
      const attendeeCount = await CommunityEventRsvp.countDocuments({
        event: event._id,
      });
      if (attendeeCount >= event.rsvpLimit) {
        return res.status(409).json({
          success: false,
          error: "This event has reached its RSVP limit.",
        });
      }
    }

    await CommunityEventRsvp.create({
      event: event._id,
      user: userId,
    });

    const attendeeCount = await CommunityEventRsvp.countDocuments({
      event: event._id,
    });

    return res.status(201).json({
      success: true,
      message: "RSVP confirmed.",
      attendeeCount,
    });
  } catch (error) {
    console.error("RSVP event error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to submit RSVP. Please try again.",
    });
  }
};

/**
 * Remove the current user's RSVP for an event
 */
const cancelEventRsvp = async (req, res) => {
  try {
    const { identifier, eventId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Please log in to manage RSVPs." });
    }

    const { community, event } = await resolveEventContext(
      identifier,
      eventId,
      userId
    );

    if (!community || !event) {
      return res
        .status(404)
        .json({ success: false, error: "Event not found." });
    }

    await CommunityEventRsvp.findOneAndDelete({
      event: event._id,
      user: userId,
    });

    const attendeeCount = await CommunityEventRsvp.countDocuments({
      event: event._id,
    });

    return res.status(200).json({
      success: true,
      message: "RSVP removed.",
      attendeeCount,
    });
  } catch (error) {
    console.error("Cancel RSVP error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update RSVP.",
    });
  }
};

/**
 * Retrieve a community by id or slug and expose field catalog metadata
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getCommunityDetails = async (req, res) => {
  try {
    const { identifier } = req.params;
    const community = await Community.findOne(
      resolveCommunityFilter(identifier)
    )
      .populate("creator", "profile.displayName profile.avatar")
      .lean();

    if (!community) {
      return res.status(404).json({
        success: false,
        error: "Community not found.",
      });
    }

    const userId = req.user?.userId || null;
    const membership = userId
      ? await CommunityMember.findOne({
          community: community._id,
          user: userId,
        })
          .select("role status joinedAt")
          .lean()
      : null;

    const isCreator = community.creator?._id?.toString() === userId;
    const isActiveMember = membership?.status === "active";

    if (community.visibility === "private" && !isActiveMember && !isCreator) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Community is private.",
      });
    }

    return res.status(200).json({
      success: true,
      community: mapCommunityPayload(community),
      membership: mapMembershipPayload(membership),
      fields: COMMUNITY_FIELD_CATALOG,
    });
  } catch (error) {
    console.error("Get community details error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load community." });
  }
};

/**
 * Promote an active member to admin
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const promoteMemberToAdmin = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { userId: targetUserId } = req.body || {};
    const actorId = req.user?.userId;

    if (!targetUserId) {
      return res
        .status(400)
        .json({ success: false, error: "Target userId is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid target userId." });
    }

    const community = await Community.findOne(
      resolveCommunityFilter(identifier)
    );
    if (!community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found." });
    }

    const [actorMembership, existingTargetMembership] = await Promise.all([
      CommunityMember.findOne({
        community: community._id,
        user: actorId,
      }),
      CommunityMember.findOne({
        community: community._id,
        user: targetUserId,
      }),
    ]);
    let targetMembership = existingTargetMembership;

    if (!actorMembership || actorMembership.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Only active members can manage admins.",
      });
    }

    if (!["owner", "admin"].includes(actorMembership.role)) {
      return res.status(403).json({
        success: false,
        error: "You must be an admin to promote members.",
      });
    }

    if (!targetMembership) {
      if (actorMembership.role !== "owner") {
        return res.status(403).json({
          success: false,
          error: "Only the community owner can add new admins.",
        });
      }
      const targetExists = await User.exists({ _id: targetUserId });
      if (!targetExists) {
        return res.status(404).json({
          success: false,
          error: "Target user does not exist.",
        });
      }
      targetMembership = await CommunityMember.create({
        community: community._id,
        user: targetUserId,
        role: "member",
        status: "active",
        invitedBy: actorId,
        joinedAt: new Date(),
      });
      community.memberCount = (community.memberCount || 0) + 1;
      community.lastActivityAt = new Date();
      await community.save();
    }

    if (targetMembership.status !== "active") {
      targetMembership.status = "active";
      targetMembership.joinedAt = targetMembership.joinedAt || new Date();
      await targetMembership.save();
    }

    if (targetMembership.role === "owner") {
      return res.status(400).json({
        success: false,
        error: "The community owner already has admin privileges.",
      });
    }

    if (targetMembership.role === "admin") {
      return res.status(200).json({
        success: true,
        message: "Member is already an admin.",
        communityId: community._id.toString(),
        membership: mapMembershipPayload(targetMembership),
        fields: COMMUNITY_FIELD_CATALOG,
      });
    }

    targetMembership.role = "admin";
    await targetMembership.save();

    return res.status(200).json({
      success: true,
      message: "Member promoted to admin.",
      communityId: community._id.toString(),
      membership: mapMembershipPayload(targetMembership),
      fields: COMMUNITY_FIELD_CATALOG,
    });
  } catch (error) {
    console.error("Promote admin error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to promote member." });
  }
};

/**
 * Demote an admin back to member
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const demoteAdmin = async (req, res) => {
  try {
    const { identifier, userId: targetUserId } = req.params;
    const actorId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid target userId." });
    }

    const community = await Community.findOne(
      resolveCommunityFilter(identifier)
    );
    if (!community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found." });
    }

    const [actorMembership, targetMembership] = await Promise.all([
      CommunityMember.findOne({
        community: community._id,
        user: actorId,
      }),
      CommunityMember.findOne({
        community: community._id,
        user: targetUserId,
      }),
    ]);

    if (!actorMembership || actorMembership.status !== "active") {
      return res.status(403).json({
        success: false,
        error: "Only active members can manage admins.",
      });
    }

    if (actorMembership.role !== "owner") {
      return res.status(403).json({
        success: false,
        error: "Only the community owner can demote admins.",
      });
    }

    if (!targetMembership || targetMembership.status !== "active") {
      return res.status(404).json({
        success: false,
        error: "Target user is not an active community member.",
      });
    }

    if (targetMembership.role !== "admin") {
      return res.status(400).json({
        success: false,
        error: "Target user is not currently an admin.",
      });
    }

    targetMembership.role = "member";
    await targetMembership.save();

    return res.status(200).json({
      success: true,
      message: "Admin demoted successfully.",
      communityId: community._id.toString(),
      membership: mapMembershipPayload(targetMembership),
      fields: COMMUNITY_FIELD_CATALOG,
    });
  } catch (error) {
    console.error("Demote admin error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to demote admin." });
  }
};

/**
 * Upload a standalone community cover image
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const uploadCommunityCover = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: "Cover image is required.",
      });
    }

    const uploaderId = (req.user?.userId || "community").toString();

    let uploadResult;

    try {
      uploadResult = await uploadBufferToCloudinary({
        buffer: req.file.buffer,
        folder: CLOUDINARY_COVER_FOLDER,
        publicId: `community-cover-${uploaderId}-${Date.now()}`,
        options: {
          transformation: [
            { width: 1600, height: 900, crop: "fill", gravity: "auto" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary cover upload error:", cloudinaryError);
      return res.status(500).json({
        success: false,
        error: "Failed to upload cover image. Please retry shortly.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Cover image uploaded successfully.",
      coverImageUrl: uploadResult.secure_url,
      coverPublicId: uploadResult.public_id,
      fields: COMMUNITY_FIELD_CATALOG,
    });
  } catch (error) {
    console.error("Upload community cover error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to upload cover image.",
    });
  }
};

/**
 * Create a post scoped to a community with visibility rules applied
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const createCommunityPost = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { title, description, location } = req.body || {};
    const userId = req.user?.userId;

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    const trimmedDescription =
      typeof description === "string" ? description.trim() : "";
    const trimmedLocation = typeof location === "string" ? location.trim() : "";

    if (!trimmedTitle) {
      return res.status(400).json({
        success: false,
        error: "Title is required to create a post.",
      });
    }

    if (!trimmedDescription) {
      return res.status(400).json({
        success: false,
        error: "Description is required to create a post.",
      });
    }

    const { community, membership, isCreator } = await fetchCommunityContext(
      identifier,
      userId
    );

    if (!community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found." });
    }

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Please log in to post." });
    }

    const isActiveMember = membership?.status === "active";
    const isBannedMember = membership?.status === "banned";
    const isPrivateCommunity = community.visibility === "private";

    if (isBannedMember) {
      return res.status(403).json({
        success: false,
        error: "You are not permitted to post in this community.",
      });
    }

    if (isPrivateCommunity && !isActiveMember && !isCreator) {
      return res.status(403).json({
        success: false,
        error: "Membership is required to post in a private community.",
      });
    }

    const newPost = await Post.create({
      author: userId,
      title: trimmedTitle,
      description: trimmedDescription,
      location: trimmedLocation || undefined,
      community: community._id,
      visibility: "community",
    });

    await newPost.populate(
      "author",
      "profile.displayName profile.avatar email"
    );

    community.postCount = (community.postCount || 0) + 1;
    community.lastActivityAt = new Date();
    await community.save();

    return res.status(201).json({
      success: true,
      message: "Post created successfully.",
      post: newPost,
    });
  } catch (error) {
    console.error("Create community post error:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ success: false, error: error.message || "Invalid payload." });
    }
    return res.status(500).json({
      success: false,
      error: "Failed to create community post.",
    });
  }
};

/**
 * Retrieve posts scoped to a community honoring visibility rules
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getCommunityPosts = async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user?.userId || null;

    const { community, membership, isCreator } = await fetchCommunityContext(
      identifier,
      userId
    );

    if (!community) {
      return res
        .status(404)
        .json({ success: false, error: "Community not found." });
    }

    const isActiveMember = membership?.status === "active";
    const isPrivateCommunity = community.visibility === "private";

    if (isPrivateCommunity && !isActiveMember && !isCreator) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Community is private.",
      });
    }

    const posts = await Post.find({ community: community._id })
      .populate("author", "profile.displayName profile.avatar email")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("Get community posts error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load community posts.",
    });
  }
};

module.exports = {
  createCommunity,
  updateCommunity,
  listCommunityAdmins,
  deleteCommunity,
  createCommunityEvent,
  getCommunityEvents,
  rsvpForEvent,
  cancelEventRsvp,
  getCommunityDetails,
  getUserCommunities,
  promoteMemberToAdmin,
  demoteAdmin,
  uploadCommunityCover,
  createCommunityPost,
  getCommunityPosts,
};
