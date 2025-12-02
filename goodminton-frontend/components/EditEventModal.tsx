import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  type CommunityEventSummary,
  type CourtSummary,
  type UpdateCommunityEventPayload,
} from "../services/api";
import {
  buildDateFromInputs,
  createEmptyDateTimeInputs,
  decomposeDateToInputs,
  sanitizeNumericInput,
  type DateTimeInputs,
} from "./events/eventFormUtils";

type LocationMode = "court" | "custom";

interface EditEventModalProps {
  visible: boolean;
  communitySlug: string | null;
  event: CommunityEventSummary | null;
  onClose: () => void;
  onEventUpdated: () => void;
}

/**
 * Modal for editing an existing community event.
 */
const EditEventModal: React.FC<EditEventModalProps> = ({
  visible,
  communitySlug,
  event,
  onClose,
  onEventUpdated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [locationMode, setLocationMode] = useState<LocationMode>("custom");
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

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setLocation("");
    setLocationMode("custom");
    setStartInputs(createEmptyDateTimeInputs());
    setEndInputs(createEmptyDateTimeInputs());
    setRsvpLimit("");
    setVisibility("community");
    setSelectedCourtId(null);
    setCourtQuery("");
    setCourtError(null);
  }, []);

  const hydrateFromEvent = useCallback(
    (target: CommunityEventSummary) => {
      setTitle(target.title ?? "");
      setDescription(target.description ?? "");
      setLocation(target.location ?? "");
      setStartInputs(decomposeDateToInputs(target.startAt));
      setEndInputs(decomposeDateToInputs(target.endAt));
      setRsvpLimit(
        typeof target.rsvpLimit === "number" && target.rsvpLimit > 0
          ? String(target.rsvpLimit)
          : ""
      );
      setVisibility(target.visibility ?? "community");
      setLocationMode(target.location ? "custom" : "court");
      setSelectedCourtId(null);
      setCourtQuery("");
      setCourtError(null);
    },
    []
  );

  useEffect(() => {
    if (!visible) {
      resetForm();
      return;
    }
    if (event) {
      hydrateFromEvent(event);
    }
  }, [event, visible, hydrateFromEvent, resetForm]);

  const loadCourts = useCallback(async () => {
    try {
      setIsCourtsLoading(true);
      setCourtError(null);
      const response = await courtsAPI.list();
      if (response.success) {
        setCourts(response.courts || []);
        return;
      }
      setCourtError(response.error || "Unable to load courts.");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        "Unable to load courts. Please try again.";
      setCourtError(errorMessage);
    } finally {
      setIsCourtsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (locationMode === "court" && courts.length === 0) {
      loadCourts();
    }
  }, [visible, locationMode, courts.length, loadCourts]);

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

  const handleStartInputChange = useCallback(
    (field: keyof DateTimeInputs, value: string, maxLength: number) => {
      setStartInputs((prev) => ({
        ...prev,
        [field]: sanitizeNumericInput(value, maxLength),
      }));
    },
    []
  );

  const handleEndInputChange = useCallback(
    (field: keyof DateTimeInputs, value: string, maxLength: number) => {
      setEndInputs((prev) => ({
        ...prev,
        [field]: sanitizeNumericInput(value, maxLength),
      }));
    },
    []
  );

  const handleSelectCourt = useCallback((court: CourtSummary) => {
    setSelectedCourtId(court._id);
    setLocation(`${court.name}, ${court.address}`);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!event) {
      Alert.alert("Event unavailable", "Unable to find this event.");
      return;
    }

    if (!communitySlug) {
      Alert.alert(
        "Missing context",
        "Community identifier required to update events."
      );
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();

    if (!trimmedTitle) {
      Alert.alert("Validation", "Please provide an event title.");
      return;
    }

    if (!trimmedDescription) {
      Alert.alert("Validation", "Please provide event details.");
      return;
    }

    if (!trimmedLocation) {
      Alert.alert("Validation", "Please provide a location for the event.");
      return;
    }

    const startDate = buildDateFromInputs(startInputs);
    const endDate = buildDateFromInputs(endInputs);

    if (!startDate || !endDate) {
      Alert.alert(
        "Validation",
        "Please supply valid start and end date/time values."
      );
      return;
    }

    if (endDate <= startDate) {
      Alert.alert("Validation", "End time must be after the start time.");
      return;
    }

    const numericLimit =
      rsvpLimit.trim() === "" ? undefined : Number(rsvpLimit.trim());

    if (
      numericLimit !== undefined &&
      (Number.isNaN(numericLimit) || numericLimit < 0)
    ) {
      Alert.alert("Validation", "RSVP limit must be a positive number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateCommunityEventPayload = {
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        visibility,
      };
      if (numericLimit !== undefined) {
        payload.rsvpLimit = numericLimit;
      }
      const response = await communityEventsAPI.update(
        communitySlug,
        event.id,
        payload
      );
      if (!response.success) {
        throw new Error(response.error || "Unable to update the event.");
      }
      Alert.alert("Event updated", "Your changes have been saved.");
      onEventUpdated();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Unable to update the event. Please try again.";
      Alert.alert("Update failed", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    communitySlug,
    endInputs,
    event,
    location,
    onEventUpdated,
    rsvpLimit,
    startInputs,
    title,
    description,
    visibility,
  ]);

  const handleCancel = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    onClose();
  }, [isSubmitting, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Edit Event</Text>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor="#949494"
              editable={!isSubmitting}
              maxLength={150}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Event details"
              placeholderTextColor="#949494"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!isSubmitting}
              maxLength={5000}
            />

            <Text style={styles.sectionLabel}>Event schedule</Text>
            <View style={styles.dateTimeBlock}>
              <Text style={styles.dateTimeLabel}>Start date</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.yearInput]}
                  value={startInputs.year}
                  onChangeText={(value) =>
                    handleStartInputChange("year", value, 4)
                  }
                  placeholder="YYYY"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={4}
                />
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.dateInput]}
                  value={startInputs.month}
                  onChangeText={(value) =>
                    handleStartInputChange("month", value, 2)
                  }
                  placeholder="MM"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={2}
                />
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.dateInput]}
                  value={startInputs.day}
                  onChangeText={(value) =>
                    handleStartInputChange("day", value, 2)
                  }
                  placeholder="DD"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={2}
                />
              </View>
              <Text style={styles.dateTimeLabel}>Start time</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.timeInput]}
                  value={startInputs.hour}
                  onChangeText={(value) =>
                    handleStartInputChange("hour", value, 2)
                  }
                  placeholder="HH"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.timeInput]}
                  value={startInputs.minute}
                  onChangeText={(value) =>
                    handleStartInputChange("minute", value, 2)
                  }
                  placeholder="MM"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.dateTimeBlock}>
              <Text style={styles.dateTimeLabel}>End date</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.yearInput]}
                  value={endInputs.year}
                  onChangeText={(value) =>
                    handleEndInputChange("year", value, 4)
                  }
                  placeholder="YYYY"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={4}
                />
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.dateInput]}
                  value={endInputs.month}
                  onChangeText={(value) =>
                    handleEndInputChange("month", value, 2)
                  }
                  placeholder="MM"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={2}
                />
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.dateInput]}
                  value={endInputs.day}
                  onChangeText={(value) =>
                    handleEndInputChange("day", value, 2)
                  }
                  placeholder="DD"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={2}
                />
              </View>
              <Text style={styles.dateTimeLabel}>End time</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.timeInput]}
                  value={endInputs.hour}
                  onChangeText={(value) =>
                    handleEndInputChange("hour", value, 2)
                  }
                  placeholder="HH"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={[styles.input, styles.segmentedInput, styles.timeInput]}
                  value={endInputs.minute}
                  onChangeText={(value) =>
                    handleEndInputChange("minute", value, 2)
                  }
                  placeholder="MM"
                  placeholderTextColor="#949494"
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={2}
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
                    <Text style={styles.courtStateText}>Loading courts...</Text>
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

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  styles.saveButton,
                  isSubmitting && styles.postButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.postButtonText}>Save changes</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

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
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#0E5B37",
    marginBottom: 16,
    textAlign: "center",
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
    marginBottom: 12,
  },
  dateTimeBlock: {
    marginBottom: 20,
  },
  dateTimeLabel: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  segmentedInput: {
    flex: 1,
    textAlign: "center",
    marginBottom: 0,
  },
  yearInput: {
    flex: 1.2,
  },
  dateInput: {
    flex: 1,
  },
  timeInput: {
    flex: 1,
  },
  timeSeparator: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: "#0E5B37",
  },
  inlineInputs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  inlineInput: {
    flex: 1,
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
  courtPicker: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  courtState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  courtStateText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#0E5B37",
    textAlign: "center",
  },
  courtList: {
    maxHeight: 220,
    gap: 8,
  },
  courtItem: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  courtItemSelected: {
    borderColor: "#0E5B37",
    backgroundColor: "#E6F2EC",
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
  selectedCourtLabel: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#C8D8D0",
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: "#0E5B37",
  },
  saveButton: {
    backgroundColor: "#0E5B37",
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
  },
  retryButton: {
    backgroundColor: "#0E5B37",
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: "DMSans_600SemiBold",
  },
});

export default EditEventModal;


