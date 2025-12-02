/**
 * @file controllers/communityController.js
 * @description Business logic for managing communities
 */
const mongoose = require("mongoose");
const Community = require("../models/Community");
const CommunityMember = require("../models/CommunityMember");
const User = require("../models/User");
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

module.exports = {
  createCommunity,
  getCommunityDetails,
  getUserCommunities,
  promoteMemberToAdmin,
  demoteAdmin,
  uploadCommunityCover,
};
