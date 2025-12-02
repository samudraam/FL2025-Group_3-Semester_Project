import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  communityEventsAPI,
  courtsAPI,
  type CourtSummary,
  postsAPI,
} from "../services/api";
import {
  buildDateFromInputs,
  createEmptyDateTimeInputs,
  sanitizeNumericInput,
  type DateTimeInputs,
} from "./events/eventFormUtils";

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  communitySlug?: string;
}

type CreatorMode = "post" | "event";
type LocationMode = "court" | "custom";
/**
 * Modal component for creating either a standard post or a community event.
 */
export default function CreatePostModal({
  visible,
  onClose,
  onPostCreated,
  communitySlug,
}: CreatePostModalProps) {
  const canCreateEvent = Boolean(communitySlug);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [creatorMode, setCreatorMode] = useState<CreatorMode>("post");
  const [locationMode, setLocationMode] = useState<LocationMode>("court");
  const [startInputs, setStartInputs] = useState<DateTimeInputs>(() =>
    createEmptyDateTimeInputs()
  );
  const [endInputs, setEndInputs] = useState<DateTimeInputs>(() =>
    createEmptyDateTimeInputs()
  );
  const [rsvpLimit, setRsvpLimit] = useState("");
  const [visibility, setVisibility] = useState<"community" | "public">(
    "community"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courts, setCourts] = useState<CourtSummary[]>([]);
  const [isCourtsLoading, setIsCourtsLoading] = useState(false);
  const [courtQuery, setCourtQuery] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [courtError, setCourtError] = useState<string | null>(null);

  const handleStartYearChange = useCallback((value: string) => {
    setStartInputs((prev) => ({
      ...prev,
      year: sanitizeNumericInput(value, 4),
    }));
  }, []);

  const handleStartMonthChange = useCallback((value: string) => {
    setStartInputs((prev) => ({
      ...prev,
      month: sanitizeNumericInput(value, 2),
    }));
  }, []);

  const handleStartDayChange = useCallback((value: string) => {
    setStartInputs((prev) => ({
      ...prev,
      day: sanitizeNumericInput(value, 2),
    }));
  }, []);

  const handleStartHourChange = useCallback((value: string) => {
    setStartInputs((prev) => ({
      ...prev,
      hour: sanitizeNumericInput(value, 2),
    }));
  }, []);

  const handleStartMinuteChange = useCallback((value: string) => {
    setStartInputs((prev) => ({
      ...prev,
      minute: sanitizeNumericInput(value, 2),
    }));
  }, []);

  const handleEndYearChange = useCallback((value: string) => {
    setEndInputs((prev) => ({
      ...prev,
      year: sanitizeNumericInput(value, 4),
    }));
  }, []);

  const handleEndMonthChange = useCallback((value: string) => {
    setEndInputs((prev) => ({
      ...prev,
      month: sanitizeNumericInput(value, 2),
    }));
  }, []);

  const handleEndDayChange = useCallback((value: string) => {
    setEndInputs((prev) => ({
      ...prev,
      day: sanitizeNumericInput(value, 2),
    }));
  }, []);

  const handleEndHourChange = useCallback((value: string) => {
    setEndInputs((prev) => ({
      ...prev,
      hour: sanitizeNumericInput(value, 2),
    }));
  }, []);

  const handleEndMinuteChange = useCallback((value: string) => {
    setEndInputs((prev) => ({
      ...prev,
      minute: sanitizeNumericInput(value, 2),
    }));
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (canCreateEvent && creatorMode === "event" && courts.length === 0) {
      loadCourts();
    }
  }, [visible, canCreateEvent, creatorMode, courts.length]);

  const filteredCourts = useMemo(() => {
    if (!courtQuery.trim()) {
      return courts;
    }
    const query = courtQuery.trim().toLowerCase();
    return courts.filter(
      (court) =>
        court.name.toLowerCase().includes(query) ||
        court.address.toLowerCase().includes(query)
    );
  }, [courtQuery, courts]);

  const selectedCourt = useMemo(() => {
    return courts.find((court) => court._id === selectedCourtId) || null;
  }, [courts, selectedCourtId]);

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setCreatorMode("post");
    setLocationMode("court");
    setStartInputs(createEmptyDateTimeInputs());
    setEndInputs(createEmptyDateTimeInputs());
    setRsvpLimit("");
    setVisibility("community");
    setSelectedCourtId(null);
    setCourtQuery("");
    setCourtError(null);
    onClose();
  };

  const loadCourts = async () => {
    try {
      setIsCourtsLoading(true);
      setCourtError(null);
      const response = await courtsAPI.list();
      if (response.success) {
        setCourts(response.courts || []);
      } else {
        setCourtError(response.error || "Unable to load courts.");
      }
    } catch (error) {
      const message =
        (error as any)?.response?.data?.error ||
        "Unable to load courts. Please try again.";
      setCourtError(message);
    } finally {
      setIsCourtsLoading(false);
    }
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();

    if (!trimmedTitle) {
      Alert.alert("Error", "Please enter a title for your post");
      return;
    }

    if (!trimmedDescription) {
      Alert.alert("Error", "Please enter a description for your post");
      return;
    }

    if (creatorMode === "event") {
      await submitEvent(trimmedTitle, trimmedDescription, trimmedLocation);
      return;
    }

    await submitPost(trimmedTitle, trimmedDescription, trimmedLocation);
  };

  const submitEvent = async (
    trimmedTitle: string,
    trimmedDescription: string,
    trimmedLocation: string
  ) => {
    if (!communitySlug) {
      Alert.alert(
        "Unavailable",
        "Events can only be created from inside a community."
      );
      return;
    }

    const startDate = buildDateFromInputs(startInputs);
    const endDate = buildDateFromInputs(endInputs);

    if (!startDate || !endDate) {
      Alert.alert(
        "Error",
        "Please provide complete and valid start/end date and time."
      );
      return;
    }

    if (endDate <= startDate) {
      Alert.alert("Error", "End time must be after the start time.");
      return;
    }

    if (!trimmedLocation) {
      Alert.alert(
        "Error",
        "Please choose a court or provide a custom location."
      );
      return;
    }

    const numericLimit = rsvpLimit ? parseInt(rsvpLimit, 10) : undefined;
    if (
      numericLimit !== undefined &&
      (Number.isNaN(numericLimit) || numericLimit < 0)
    ) {
      Alert.alert("Error", "RSVP limit must be a positive number.");
      return;
    }

    setIsSubmitting(true);
    try {
      await communityEventsAPI.create(communitySlug, {
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        rsvpLimit: numericLimit,
        visibility,
      });
      Alert.alert("Success", "Event created successfully.");
      resetForm();
      onPostCreated();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        "Failed to create event. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPost = async (
    trimmedTitle: string,
    trimmedDescription: string,
    trimmedLocation: string
  ) => {
    setIsSubmitting(true);
    try {
      if (communitySlug) {
        await postsAPI.createCommunityPost(communitySlug, {
          title: trimmedTitle,
          description: trimmedDescription,
          location: trimmedLocation || undefined,
        });
      } else {
        await postsAPI.createPost({
          title: trimmedTitle,
          description: trimmedDescription,
          location: trimmedLocation || undefined,
        });
      }

      Alert.alert("Success", "Post created successfully.");
      resetForm();
      onPostCreated();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        "Failed to create post. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectCourt = (court: CourtSummary) => {
    setSelectedCourtId(court._id);
    setLocation(`${court.name}, ${court.address}`);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>
              {creatorMode === "event" ? "Create Event" : "Make a Post"}
            </Text>

            <View style={styles.toggleGroup}>
              <Pressable
                onPress={() => setCreatorMode("post")}
                disabled={isSubmitting}
                style={[
                  styles.toggleButton,
                  creatorMode === "post" && styles.toggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    creatorMode === "post" && styles.toggleLabelActive,
                  ]}
                >
                  Post
                </Text>
              </Pressable>
              {canCreateEvent && (
                <Pressable
                  onPress={() => setCreatorMode("event")}
                  disabled={isSubmitting}
                  style={[
                    styles.toggleButton,
                    creatorMode === "event" && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleLabel,
                      creatorMode === "event" && styles.toggleLabelActive,
                    ]}
                  >
                    Event
                  </Text>
                </Pressable>
              )}
            </View>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="title"
              placeholderTextColor="#949494"
              editable={!isSubmitting}
              maxLength={150}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="enter text"
              placeholderTextColor="#949494"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!isSubmitting}
              maxLength={5000}
            />

            {creatorMode === "post" && (
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="location (optional)"
                placeholderTextColor="#949494"
                editable={!isSubmitting}
              />
            )}

            {creatorMode === "event" && (
              <>
                <Text style={styles.sectionLabel}>Event schedule</Text>
                <View style={styles.dateTimeBlock}>
                  <Text style={styles.dateTimeLabel}>Start date</Text>
                  <View style={styles.dateRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.yearInput,
                      ]}
                      value={startInputs.year}
                      onChangeText={handleStartYearChange}
                      placeholder="YYYY"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={4}
                      editable={!isSubmitting}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.dateInput,
                      ]}
                      value={startInputs.month}
                      onChangeText={handleStartMonthChange}
                      placeholder="MM"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isSubmitting}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.dateInput,
                      ]}
                      value={startInputs.day}
                      onChangeText={handleStartDayChange}
                      placeholder="DD"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isSubmitting}
                    />
                  </View>
                  <Text style={styles.dateTimeLabel}>Start time</Text>
                  <View style={styles.timeRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.timeInput,
                      ]}
                      value={startInputs.hour}
                      onChangeText={handleStartHourChange}
                      placeholder="HH"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isSubmitting}
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.timeInput,
                      ]}
                      value={startInputs.minute}
                      onChangeText={handleStartMinuteChange}
                      placeholder="MM"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isSubmitting}
                    />
                  </View>
                </View>

                <View style={styles.dateTimeBlock}>
                  <Text style={styles.dateTimeLabel}>End date</Text>
                  <View style={styles.dateRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.yearInput,
                      ]}
                      value={endInputs.year}
                      onChangeText={handleEndYearChange}
                      placeholder="YYYY"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={4}
                      editable={!isSubmitting}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.dateInput,
                      ]}
                      value={endInputs.month}
                      onChangeText={handleEndMonthChange}
                      placeholder="MM"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isSubmitting}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.dateInput,
                      ]}
                      value={endInputs.day}
                      onChangeText={handleEndDayChange}
                      placeholder="DD"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isSubmitting}
                    />
                  </View>
                  <Text style={styles.dateTimeLabel}>End time</Text>
                  <View style={styles.timeRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.timeInput,
                      ]}
                      value={endInputs.hour}
                      onChangeText={handleEndHourChange}
                      placeholder="HH"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isSubmitting}
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={[
                        styles.input,
                        styles.segmentedInput,
                        styles.timeInput,
                      ]}
                      value={endInputs.minute}
                      onChangeText={handleEndMinuteChange}
                      placeholder="MM"
                      placeholderTextColor="#949494"
                      keyboardType="number-pad"
                      maxLength={2}
                      editable={!isSubmitting}
                    />
                  </View>
                </View>
                <View style={styles.inlineInputs}>
                  <TextInput
                    style={[styles.input, styles.inlineInput]}
                    value={rsvpLimit}
                    onChangeText={setRsvpLimit}
                    placeholder="RSVP limit (optional)"
                    placeholderTextColor="#949494"
                    keyboardType="number-pad"
                    editable={!isSubmitting}
                  />
                  <TextInput
                    style={[styles.input, styles.inlineInput]}
                    value={visibility}
                    onChangeText={(value) =>
                      setVisibility(
                        value.trim().toLowerCase() === "public"
                          ? "public"
                          : "community"
                      )
                    }
                    placeholder="Visibility (community/public)"
                    placeholderTextColor="#949494"
                    editable={!isSubmitting}
                  />
                </View>

                <Text style={styles.sectionLabel}>Location</Text>
                <View style={styles.toggleGroup}>
                  <Pressable
                    onPress={() => setLocationMode("court")}
                    disabled={isSubmitting}
                    style={[
                      styles.toggleButton,
                      locationMode === "court" && styles.toggleButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleLabel,
                        locationMode === "court" && styles.toggleLabelActive,
                      ]}
                    >
                      Choose court
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setLocationMode("custom");
                      setSelectedCourtId(null);
                    }}
                    disabled={isSubmitting}
                    style={[
                      styles.toggleButton,
                      locationMode === "custom" && styles.toggleButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleLabel,
                        locationMode === "custom" && styles.toggleLabelActive,
                      ]}
                    >
                      Custom location
                    </Text>
                  </Pressable>
                </View>

                {locationMode === "court" ? (
                  <View style={styles.courtPicker}>
                    {isCourtsLoading ? (
                      <View style={styles.courtState}>
                        <ActivityIndicator color="#0E5B37" />
                        <Text style={styles.courtStateText}>
                          Loading courts...
                        </Text>
                      </View>
                    ) : courtError ? (
                      <View style={styles.courtState}>
                        <Text style={styles.courtStateText}>{courtError}</Text>
                        <Pressable
                          style={[styles.button, styles.retryButton]}
                          onPress={loadCourts}
                          disabled={isSubmitting}
                        >
                          <Text style={styles.retryButtonText}>Retry</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          style={styles.input}
                          value={courtQuery}
                          onChangeText={setCourtQuery}
                          placeholder="Search courts"
                          placeholderTextColor="#949494"
                          editable={!isSubmitting}
                        />
                        <View style={styles.courtList}>
                          {filteredCourts.slice(0, 20).map((court) => (
                            <Pressable
                              key={court._id}
                              style={[
                                styles.courtItem,
                                court._id === selectedCourtId &&
                                  styles.courtItemSelected,
                              ]}
                              onPress={() => handleSelectCourt(court)}
                            >
                              <Text style={styles.courtName}>{court.name}</Text>
                              <Text style={styles.courtAddress}>
                                {court.address}
                              </Text>
                            </Pressable>
                          ))}
                          {selectedCourt && (
                            <Text style={styles.selectedCourtLabel}>
                              Selected: {selectedCourt.name} -{" "}
                              {selectedCourt.address}
                            </Text>
                          )}
                          {filteredCourts.length === 0 && (
                            <Text style={styles.courtStateText}>
                              No courts matched your search.
                            </Text>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Custom location"
                    placeholderTextColor="#949494"
                    editable={!isSubmitting}
                  />
                )}
              </>
            )}

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.button,
                  styles.postButton,
                  isSubmitting && styles.postButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 16,
    textAlign: "center",
  },
  toggleGroup: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8D8D0",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#0E5B37",
    borderColor: "#0E5B37",
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
  },
  toggleLabelActive: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: "#000",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    minHeight: 150,
    paddingTop: 14,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
    marginBottom: 8,
  },
  inlineInputs: {
    flexDirection: "row",
    gap: 12,
  },
  inlineInput: {
    flex: 1,
  },
  dateTimeBlock: {
    marginBottom: 16,
  },
  dateTimeLabel: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: "#4A4A4A",
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  segmentedInput: {
    marginBottom: 0,
    textAlign: "center",
  },
  yearInput: {
    flex: 1.4,
  },
  dateInput: {
    flex: 1,
  },
  timeInput: {
    flex: 1,
  },
  timeSeparator: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
  },
  courtPicker: {
    marginTop: 12,
  },
  courtList: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  courtItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F7FBF9",
  },
  courtItemSelected: {
    backgroundColor: "#DCEFE8",
    borderWidth: 1,
    borderColor: "#0E5B37",
  },
  courtName: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
  },
  courtAddress: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#4A4A4A",
    marginTop: 4,
  },
  courtState: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  courtStateText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#4A4A4A",
    textAlign: "center",
  },
  selectedCourtLabel: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0E5B37",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: "DMSans_600SemiBold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#666",
  },
  postButton: {
    backgroundColor: "#0E5B37",
  },
  postButtonDisabled: {
    backgroundColor: "#7FA593",
  },
  postButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
  },
});
