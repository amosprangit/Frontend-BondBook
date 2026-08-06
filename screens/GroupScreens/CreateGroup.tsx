import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from 'expo-image-picker';
import { useCreateGroupChatMutation } from "../../store/api/groupChatApi";
import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function CreateGroupScreen({ navigation, route }: { navigation: any; route: any }) {
  const { currentUser, mutualConnections = [] } = route.params || {};
  
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [createGroupChat] = useCreateGroupChatMutation();

  // Filter connections based on search
  const filteredConnections = mutualConnections.filter((connection: any) => {
    const displayName = connection.displayName || connection.otherUser?.username || "";
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Toggle member selection
  const toggleMemberSelection = (connectionId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(connectionId)) {
        return prev.filter(id => id !== connectionId);
      } else {
        return [...prev, connectionId];
      }
    });
  };

  // Select group image
  const handleSelectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permission to select a group photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setGroupImage(result.assets[0].uri);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setGroupImage(null);
  };

  // Create group
  const handleCreateGroup = async () => {
    // Validation
    if (!groupName.trim()) {
      Alert.alert('Group Name Required', 'Please enter a name for your group.');
      return;
    }

    if (selectedMembers.length < 2) {
      Alert.alert('Members Required', 'Please select at least 2 members for the group.');
      return;
    }

    setIsCreating(true);

    try {
      const formData = new FormData();
      formData.append('name', groupName.trim());
      formData.append('description', groupDescription.trim());
      formData.append('members', JSON.stringify(selectedMembers));

      if (groupImage) {
        const filename = groupImage.split('/').pop() || 'group-image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('groupImage', {
          uri: groupImage,
          name: filename,
          type,
        } as any);
      }

      const result = await createGroupChat(formData).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Group Created! 🎉',
        text2: `${groupName} has been created successfully`,
        visibilityTime: 3000,
      });

      // Navigate to the new group chat
      navigation.replace("GroupChat", {
        groupId: result.group._id,
        groupName: result.group.name,
        groupData: result.group,
      });

    } catch (error: any) {
      console.error('Error creating group:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.data?.message || 'Failed to create group. Please try again.',
        visibilityTime: 4000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Get profile picture URL
  const getProfilePicture = (connection: any) => {
    if (connection?.profilePicture) {
      return `${API_URL}/${connection.profilePicture.replace(/^\//, "")}`;
    }
    if (connection?.otherUser?.profilePicture) {
      return `${API_URL}/${connection.otherUser.profilePicture.replace(/^\//, "")}`;
    }
    return null;
  };

  // Get display name
  const getDisplayName = (connection: any) => {
    return connection.displayName || connection.otherUser?.username || connection.otherUser?.displayName || "User";
  };

  // Render member item
  const renderMemberItem = ({ item }: any) => {
    const profilePic = getProfilePicture(item);
    const displayName = getDisplayName(item);
    const isSelected = selectedMembers.includes(item.connectionId || item._id);

    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          isSelected && styles.memberItemSelected,
        ]}
        onPress={() => toggleMemberSelection(item.connectionId || item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.memberInfo}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.memberAvatar} />
          ) : (
            <View style={[styles.memberAvatar, styles.defaultAvatar]}>
              <Text style={styles.defaultAvatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{displayName}</Text>
            <Text style={styles.memberStatus}>
              {item.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render selected member chips
  const renderSelectedMembers = () => {
    if (selectedMembers.length === 0) return null;

    return (
      <View style={styles.selectedMembersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectedMembersScroll}
        >
          {selectedMembers.map((memberId) => {
            const member = mutualConnections.find(
              (conn: any) => (conn.connectionId || conn._id) === memberId
            );
            if (!member) return null;

            const profilePic = getProfilePicture(member);
            const displayName = getDisplayName(member);

            return (
              <View key={memberId} style={styles.chip}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.chipAvatar} />
                ) : (
                  <View style={[styles.chipAvatar, styles.chipDefaultAvatar]}>
                    <Text style={styles.chipAvatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.chipName} numberOfLines={1}>
                  {displayName.split(' ')[0]}
                </Text>
                <TouchableOpacity
                  onPress={() => toggleMemberSelection(memberId)}
                  style={styles.chipRemove}
                >
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerTitleContainer}
        >
          <Text style={styles.headerTitle}>New Group</Text>
        </LinearGradient>

        <TouchableOpacity
          style={[
            styles.createButton,
            (!groupName.trim() || selectedMembers.length < 2 || isCreating) && 
            styles.createButtonDisabled,
          ]}
          onPress={handleCreateGroup}
          disabled={!groupName.trim() || selectedMembers.length < 2 || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Group Image Section */}
          <View style={styles.imageSection}>
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={handleSelectImage}
              activeOpacity={0.7}
            >
              {groupImage ? (
                <>
                  <Image source={{ uri: groupImage }} style={styles.groupImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={32} color="#8B5CF6" />
                  <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Group Details Section */}
          <View style={styles.detailsSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Group Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter group name"
                placeholderTextColor="#9CA3AF"
                value={groupName}
                onChangeText={setGroupName}
                maxLength={50}
              />
              <Text style={styles.characterCount}>
                {groupName.length}/50
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Add group description"
                placeholderTextColor="#9CA3AF"
                value={groupDescription}
                onChangeText={setGroupDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {groupDescription.length}/200
              </Text>
            </View>
          </View>

          {/* Selected Members */}
          {renderSelectedMembers()}

          {/* Members Count */}
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>
              Add Members
            </Text>
            <Text style={styles.membersCount}>
              {selectedMembers.length} selected
            </Text>
          </View>

          {/* Search Members */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8B5CF6" />
            <TextInput
              placeholder="Search connections..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Members List */}
          <View style={styles.membersList}>
            {filteredConnections.length > 0 ? (
              filteredConnections.map((connection: any) => (
                <View key={connection.connectionId || connection._id}>
                  {renderMemberItem({ item: connection })}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  {searchQuery ? "No connections found" : "No connections available"}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Create Button for Mobile */}
      {Platform.OS === 'android' && (
        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={[
              styles.bottomCreateButton,
              (!groupName.trim() || selectedMembers.length < 2 || isCreating) && 
              styles.createButtonDisabled,
            ]}
            onPress={handleCreateGroup}
            disabled={!groupName.trim() || selectedMembers.length < 2 || isCreating}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="people" size={20} color="#FFFFFF" />
                <Text style={styles.bottomButtonText}>
                  Create Group ({selectedMembers.length} members)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  createButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#8B5CF6",
    borderRadius: 20,
  },
  createButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
  },
  groupImage: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: "#8B5CF6",
    marginTop: 8,
    fontWeight: "500",
  },
  detailsSection: {
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 4,
  },
  selectedMembersContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  selectedMembersScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  chipDefaultAvatar: {
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
  },
  chipAvatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  chipName: {
    fontSize: 13,
    color: "#374151",
    marginLeft: 8,
    marginRight: 4,
    maxWidth: 80,
  },
  chipRemove: {
    marginLeft: 4,
  },
  membersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  membersCount: {
    fontSize: 14,
    color: "#8B5CF6",
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  membersList: {
    paddingHorizontal: 20,
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  memberItemSelected: {
    borderColor: "#8B5CF6",
    backgroundColor: "#F5F3FF",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  defaultAvatar: {
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  memberStatus: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
  },
  bottomButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomCreateButton: {
    flexDirection: "row",
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});