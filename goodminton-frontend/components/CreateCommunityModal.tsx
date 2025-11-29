import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  CommunitySummary,
  communitiesAPI,
  usersAPI,
  CommunityVisibility,
} from "../services/api";
import { fetchWithRetry } from "../services/apiHelpers";
import { useAuth } from "../services/authContext";
import { Camera, ArrowUpFromLine, ImageIcon } from "lucide-react-native";

type CreateCommunityModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreated?: (community: CommunitySummary) => void;
};

type AdminCandidate = {
  id: string;
  displayName: string;
  email?: string;
  avatar?: string | null;
};

const MAX_DESCRIPTION_LENGTH = 300;

const slugify = (value: string) => {
  if (!value) {
    return "";
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

/**
 * Modal for creating badminton communities.
 */
const CreateCommunityModal = ({
  visible,
  onClose,
  onCreated,
}: CreateCommunityModalProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id || (user as any)?._id || "";
  const [communityStatus, setCommunityStatus] =
    useState<CommunityVisibility>("private");
  const [communityName, setCommunityName] = useState("");
  const [communitySlug, setCommunitySlug] = useState("");
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverPreviewUri, setCoverPreviewUri] = useState("");
  const [description, setDescription] = useState("");
  const [adminSearchInput, setAdminSearchInput] = useState("");
  const [adminSearchResults, setAdminSearchResults] = useState<
    AdminCandidate[]
  >([]);
  const [selectedAdmins, setSelectedAdmins] = useState<AdminCandidate[]>([]);
  const [isSearchingAdmins, setIsSearchingAdmins] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingDescriptionChars = useMemo(() => {
    const remaining = MAX_DESCRIPTION_LENGTH - description.length;
    return remaining < 0 ? 0 : remaining;
  }, [description.length]);

  const disableSubmit = useMemo(() => {
    return !communityName.trim() || isSubmitting || isUploadingCover;
  }, [communityName, isSubmitting, isUploadingCover]);

  const previewUri = useMemo(() => {
    return coverPreviewUri || coverImageUrl;
  }, [coverPreviewUri, coverImageUrl]);

  const resetForm = useCallback(() => {
    setCommunityStatus("private");
    setCommunityName("");
    setCommunitySlug("");
    setSlugEditedManually(false);
    setCoverImageUrl("");
    setCoverPreviewUri("");
    setDescription("");
    setAdminSearchInput("");
    setAdminSearchResults([]);
    setSelectedAdmins([]);
    setIsSearchingAdmins(false);
    setIsUploadingCover(false);
    setCoverUploadError(null);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [resetForm, visible]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const normalizeToCandidate = useCallback(
    (input: any): AdminCandidate | null => {
      if (!input) {
        return null;
      }
      const id = input.id || input._id;
      if (!id || id === currentUserId) {
        return null;
      }
      const profile = input.profile || {};
      const displayName =
        input.displayName ||
        profile.displayName ||
        input.firstName ||
        profile.firstName ||
        input.email ||
        "Unknown Player";
      return {
        id,
        displayName,
        email: input.email,
        avatar: input.avatar || profile.avatar || null,
      };
    },
    [currentUserId]
  );

  const handleToggleStatus = useCallback(
    (nextStatus: CommunityVisibility) => {
      if (communityStatus === nextStatus) {
        return;
      }
      setCommunityStatus(nextStatus);
    },
    [communityStatus]
  );

  const handleNameChange = useCallback(
    (value: string) => {
      setCommunityName(value);
      if (!slugEditedManually) {
        setCommunitySlug(slugify(value));
      }
    },
    [slugEditedManually]
  );

  const handleSlugChange = useCallback((value: string) => {
    setCommunitySlug(slugify(value));
    setSlugEditedManually(true);
  }, []);

  const handleDescriptionChange = useCallback((value: string) => {
    if (value.length > MAX_DESCRIPTION_LENGTH) {
      return;
    }
    setDescription(value);
  }, []);

  const handleCoverImageSelection = useCallback(
    async (source: "camera" | "library") => {
      const fallbackPreview = coverPreviewUri || coverImageUrl || "";
      try {
        const permission =
          source === "camera"
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Permission needed",
            "Please allow Goodminton to access your camera or photos to set a cover image."
          );
          return;
        }

        const pickerResult =
          source === "camera"
            ? await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "images",
                allowsEditing: true,
                quality: 0.8,
              });

        if (pickerResult.canceled || pickerResult.assets.length === 0) {
          return;
        }

        const asset = pickerResult.assets[0];
        setCoverPreviewUri(asset.uri);
        setIsUploadingCover(true);
        setCoverUploadError(null);

        const inferredMime =
          asset.mimeType ||
          (asset.uri.toLowerCase().endsWith(".png")
            ? "image/png"
            : "image/jpeg");
        const fallbackExtension = inferredMime === "image/png" ? "png" : "jpg";
        const filename =
          asset.fileName ||
          `community-cover-${Date.now()}.${fallbackExtension}`;

        const formData = new FormData();
        formData.append("cover", {
          uri: asset.uri,
          name: filename,
          type: inferredMime,
        } as any);

        const uploadResponse = await communitiesAPI.uploadCover(formData);

        if (!uploadResponse.success || !uploadResponse.coverImageUrl) {
          throw new Error(
            uploadResponse.error || "Unable to upload cover image."
          );
        }

        setCoverImageUrl(uploadResponse.coverImageUrl);
        setCoverPreviewUri(uploadResponse.coverImageUrl);
      } catch (error: any) {
        console.error("Cover upload failed", error);
        setCoverUploadError(error?.message || "Unable to upload cover image.");
        setCoverPreviewUri(fallbackPreview);
        Alert.alert(
          "Upload failed",
          error?.message ||
            "We couldn't upload that image. Please try a different photo."
        );
      } finally {
        setIsUploadingCover(false);
      }
    },
    [coverImageUrl, coverPreviewUri]
  );

  const handleRemoveCover = useCallback(() => {
    setCoverImageUrl("");
    setCoverPreviewUri("");
    setCoverUploadError(null);
  }, []);

  const handleSearchAdmins = useCallback(async () => {
    const query = adminSearchInput.trim();
    if (!query) {
      Alert.alert("Enter a value", "Provide an email or name to search.");
      return;
    }
    setIsSearchingAdmins(true);
    setAdminSearchResults([]);
    try {
      const response = await fetchWithRetry(() => usersAPI.search(query), {
        skipCache: true,
      });
      const candidates: AdminCandidate[] = [];
      if (Array.isArray(response?.users)) {
        response.users.forEach((candidate: any) => {
          const normalized = normalizeToCandidate(candidate);
          if (normalized) {
            candidates.push(normalized);
          }
        });
      }
      if (response?.user) {
        const normalized = normalizeToCandidate(response.user);
        if (normalized) {
          candidates.push(normalized);
        }
      }
      const uniqueCandidates = candidates.filter(
        (candidate, index, arr) =>
          arr.findIndex((c) => c.id === candidate.id) === index &&
          !selectedAdmins.some((admin) => admin.id === candidate.id)
      );
      if (uniqueCandidates.length === 0) {
        Alert.alert(
          "No matches",
          "No eligible users found or they are already selected."
        );
        return;
      }
      setAdminSearchResults(uniqueCandidates);
    } catch (error: any) {
      const message =
        error?.response?.data?.error || "Unable to search for admins.";
      Alert.alert("Search failed", message);
    } finally {
      setIsSearchingAdmins(false);
    }
  }, [adminSearchInput, normalizeToCandidate, selectedAdmins]);

  const handleAddAdmin = useCallback((candidate: AdminCandidate) => {
    setSelectedAdmins((prev) => {
      if (prev.some((admin) => admin.id === candidate.id)) {
        return prev;
      }
      return [...prev, candidate];
    });
    setAdminSearchInput("");
    setAdminSearchResults([]);
  }, []);

  const handleRemoveAdmin = useCallback((candidateId: string) => {
    setSelectedAdmins((prev) =>
      prev.filter((admin) => admin.id !== candidateId)
    );
  }, []);

  const promoteAdmins = useCallback(
    async (identifier: string) => {
      if (!selectedAdmins.length) {
        return { promoted: 0, failed: 0 };
      }
      let promoted = 0;
      let failed = 0;
      for (const admin of selectedAdmins) {
        try {
          const response = await fetchWithRetry(
            () => communitiesAPI.promoteAdmin(identifier, admin.id),
            { skipCache: true }
          );
          if (response.success) {
            promoted += 1;
          } else {
            failed += 1;
          }
        } catch (error) {
          console.error("Failed to promote admin", error);
          failed += 1;
        }
      }
      return { promoted, failed };
    },
    [selectedAdmins]
  );

  const handleSubmit = useCallback(async () => {
    const trimmedName = communityName.trim();
    if (trimmedName.length < 3) {
      Alert.alert(
        "Name too short",
        "Community name must contain at least 3 characters."
      );
      return;
    }
    if (!communitySlug.trim()) {
      Alert.alert("Missing slug", "Provide a slug or let us auto-generate it.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        slug: communitySlug.trim(),
        description: description.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        visibility: communityStatus,
      };
      const response = await fetchWithRetry(
        () => communitiesAPI.create(payload),
        { skipCache: true }
      );
      if (!response.success || !response.community) {
        throw new Error(response.error || "Failed to create community.");
      }
      const identifier = response.community.id || response.community.slug;
      const { promoted, failed } = identifier
        ? await promoteAdmins(identifier)
        : { promoted: 0, failed: selectedAdmins.length };
      const adminSummary =
        promoted || failed
          ? `\nPromoted admins: ${promoted}. Failed: ${failed}.`
          : "";
      Alert.alert(
        "Community created",
        `${response.community.name} is ready!${adminSummary}`,
        [{ text: "Great", onPress: handleClose }]
      );
      onCreated?.(response.community);
    } catch (error: any) {
      console.error("Community creation failed", error);
      const message =
        error?.response?.data?.error || error.message || "Please try again.";
      Alert.alert("Creation failed", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    communityName,
    communitySlug,
    description,
    coverImageUrl,
    communityStatus,
    promoteAdmins,
    selectedAdmins.length,
    handleClose,
    onCreated,
  ]);

  const renderSelectedAdmin = (admin: AdminCandidate) => (
    <View key={admin.id} style={styles.adminChip}>
      <Text style={styles.adminChipText}>{admin.displayName}</Text>
      <Pressable
        style={styles.removeChipButton}
        onPress={() => handleRemoveAdmin(admin.id)}
      >
        <Text style={styles.removeChipButtonText}>✕</Text>
      </Pressable>
    </View>
  );

  const renderSearchResult = (candidate: AdminCandidate) => (
    <View key={candidate.id} style={styles.searchResultRow}>
      <View style={styles.searchCandidateInfo}>
        {candidate.avatar ? (
          <Image
            source={{ uri: candidate.avatar }}
            style={styles.searchCandidateAvatar}
          />
        ) : (
          <View style={styles.searchCandidatePlaceholder}>
            <Text style={styles.searchCandidateInitial}>
              {candidate.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.searchCandidateText}>
          <Text style={styles.searchCandidateName}>
            {candidate.displayName}
          </Text>
          {candidate.email ? (
            <Text style={styles.searchCandidateEmail}>{candidate.email}</Text>
          ) : null}
        </View>
      </View>
      <Pressable
        style={styles.addAdminButton}
        onPress={() => handleAddAdmin(candidate)}
      >
        <Text style={styles.addAdminButtonText}>Add</Text>
      </Pressable>
    </View>
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Make a community!</Text>
            <Text style={styles.subtitle}>
              Enter details to create a badminton community
            </Text>

            <View style={styles.coverContainer}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Text style={styles.coverPlaceholderIcon}>
                    <ImageIcon size={80} color="grey" strokeWidth={0.8} />
                  </Text>
                  <Text style={styles.coverPlaceholderText}>
                    Upload a cover photo, you can change this later
                  </Text>
                </View>
              )}
              {isUploadingCover && (
                <View style={styles.coverUploadingOverlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.coverUploadingText}>Uploading...</Text>
                </View>
              )}
            </View>
            <View style={styles.coverActionsRow}>
              <Pressable
                style={[
                  styles.coverActionButton,
                  isUploadingCover && styles.coverActionButtonDisabled,
                ]}
                onPress={() => handleCoverImageSelection("library")}
                disabled={isUploadingCover}
              >
                <Text style={styles.coverActionButtonText}>
                  {" "}
                  <ArrowUpFromLine size={20} color="white" />{" "}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.coverActionButton,
                  isUploadingCover && styles.coverActionButtonDisabled,
                ]}
                onPress={() => handleCoverImageSelection("camera")}
                disabled={isUploadingCover}
              >
                <Text style={styles.coverActionButtonText}>
                  <Camera size={20} color="white" />
                </Text>
              </Pressable>
              {previewUri ? (
                <Pressable
                  style={[
                    styles.coverRemoveButton,
                    isUploadingCover && styles.coverActionButtonDisabled,
                  ]}
                  onPress={handleRemoveCover}
                  disabled={isUploadingCover}
                >
                  <Text style={styles.coverRemoveButtonText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            {coverUploadError ? (
              <Text style={styles.errorText}>{coverUploadError}</Text>
            ) : (
              <Text style={styles.helperText}>
                Upload from your camera or photo library. JPEG, PNG, or WEBP up
                to 4MB.
              </Text>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Community Status</Text>
              <View style={styles.statusToggle}>
                <Pressable
                  style={[
                    styles.statusOption,
                    communityStatus === "private" && styles.statusOptionActive,
                  ]}
                  onPress={() => handleToggleStatus("private")}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      communityStatus === "private" &&
                        styles.statusOptionTextActive,
                    ]}
                  >
                    Private
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.statusOption,
                    communityStatus === "public" && styles.statusOptionActive,
                  ]}
                  onPress={() => handleToggleStatus("public")}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      communityStatus === "public" &&
                        styles.statusOptionTextActive,
                    ]}
                  >
                    Public
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Enter Community Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Community Name"
                placeholderTextColor="#9A9A9A"
                value={communityName}
                onChangeText={handleNameChange}
              />
              <Text style={styles.helperText}>
                Please avoid profane or offensive content.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Community Slug</Text>
              <TextInput
                style={styles.input}
                placeholder="community-name"
                placeholderTextColor="#9A9A9A"
                autoCapitalize="none"
                value={communitySlug}
                onChangeText={handleSlugChange}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Enter a short description</Text>
              <TextInput
                style={styles.descriptionInput}
                multiline
                placeholder="Describe your community"
                placeholderTextColor="#9A9A9A"
                value={description}
                onChangeText={handleDescriptionChange}
              />
              <Text style={styles.charCounter}>
                {remainingDescriptionChars} CH
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Add Admins</Text>
              {selectedAdmins.length > 0 ? (
                <View style={styles.selectedAdminsContainer}>
                  {selectedAdmins.map(renderSelectedAdmin)}
                </View>
              ) : (
                <Text style={styles.helperText}>
                  Optional: promote trusted members to help you moderate.
                </Text>
              )}
              <View style={styles.adminSearchRow}>
                <TextInput
                  style={styles.adminSearchInput}
                  placeholder="Search by email"
                  placeholderTextColor="#9A9A9A"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={adminSearchInput}
                  onChangeText={setAdminSearchInput}
                  onSubmitEditing={handleSearchAdmins}
                />
                <Pressable
                  style={[
                    styles.adminSearchButton,
                    isSearchingAdmins && styles.adminSearchButtonDisabled,
                  ]}
                  onPress={handleSearchAdmins}
                  disabled={isSearchingAdmins}
                >
                  {isSearchingAdmins ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.adminSearchButtonText}>Search</Text>
                  )}
                </Pressable>
              </View>
              {adminSearchResults.map(renderSearchResult)}
            </View>

            <View style={styles.footerButtons}>
              <Pressable style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.submitButton,
                  disableSubmit && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={disableSubmit}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Group</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(CreateCommunityModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxHeight: "95%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#101828",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#667085",
    textAlign: "center",
    marginBottom: 20,
  },
  coverContainer: {
    width: "100%",
    height: 160,
    borderRadius: 20,
    backgroundColor: "#F2F4F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  coverPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  coverPlaceholderIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  coverPlaceholderText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#667085",
    textAlign: "center",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  coverUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 24, 40, 0.55)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  coverUploadingText: {
    color: "#fff",
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  coverActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  coverActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#0F9D58",
  },
  coverActionButtonDisabled: {
    opacity: 0.6,
  },
  coverActionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
  },
  coverRemoveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D92D20",
  },
  coverRemoveButtonText: {
    color: "#D92D20",
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#101828",
    marginBottom: 10,
  },
  statusToggle: {
    flexDirection: "row",
    backgroundColor: "#E4E7EC",
    borderRadius: 16,
    padding: 4,
  },
  statusOption: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusOptionActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusOptionText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#475467",
  },
  statusOptionTextActive: {
    color: "#0F9D58",
    fontFamily: "DMSans_700Bold",
  },
  input: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    paddingHorizontal: 14,
    fontFamily: "DMSans_500Medium",
    color: "#101828",
    backgroundColor: "#fff",
  },
  helperText: {
    marginTop: 6,
    marginBottom: 16,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#98A2B3",
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#D92D20",
  },
  descriptionInput: {
    width: "100%",
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DMSans_500Medium",
    color: "#101828",
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  charCounter: {
    alignSelf: "flex-end",
    marginTop: 8,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#98A2B3",
  },
  selectedAdminsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  adminChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E4F3EC",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminChipText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: "#0F9D58",
    marginRight: 8,
  },
  removeChipButton: {
    backgroundColor: "#fff",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0F9D58",
  },
  removeChipButtonText: {
    fontSize: 12,
    color: "#0F9D58",
  },
  adminSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  adminSearchInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    paddingHorizontal: 14,
    fontFamily: "DMSans_500Medium",
    color: "#101828",
    backgroundColor: "#fff",
    marginRight: 10,
  },
  adminSearchButton: {
    width: 96,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0F9D58",
    alignItems: "center",
    justifyContent: "center",
  },
  adminSearchButtonDisabled: {
    opacity: 0.6,
  },
  adminSearchButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FC",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  searchCandidateInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  searchCandidateAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  searchCandidatePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  searchCandidateInitial: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#4B5563",
  },
  searchCandidateText: {
    flex: 1,
  },
  searchCandidateName: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#101828",
  },
  searchCandidateEmail: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#667085",
  },
  addAdminButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0F9D58",
  },
  addAdminButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#475467",
  },
  submitButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0F9D58",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
});
