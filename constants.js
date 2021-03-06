
const ReportTypes = Object.freeze({
    OBSERVER_EVENT: "OBSERVER_EVENT",
    CALL_EVENT: "CALL_EVENT",
    CALL_META_DATA: "CALL_META_DATA",
    CLIENT_EXTENSION_DATA: "CLIENT_EXTENSION_DATA",
    PEER_CONNECTION_TRANSPORT: "PEER_CONNECTION_TRANSPORT",
    PEER_CONNECTION_DATA_CHANNEL: "PEER_CONNECTION_DATA_CHANNEL",
    INBOUND_AUDIO_TRACK: "INBOUND_AUDIO_TRACK",
    INBOUND_VIDEO_TRACK: "INBOUND_VIDEO_TRACK",
    OUTBOUND_AUDIO_TRACK: "OUTBOUND_AUDIO_TRACK",
    OUTBOUND_VIDEO_TRACK: "OUTBOUND_VIDEO_TRACK",
    MEDIA_TRACK: "MEDIA_TRACK",
    SFU_EVENT: "SFU_EVENT",
    SFU_META_DATA: "SFU_META_DATA",
    SFU_TRANSPORT: "SFU_TRANSPORT",
    SFU_INBOUND_RTP_PAD: "SFU_INBOUND_RTP_PAD",
    SFU_OUTBOUND_RTP_PAD: "SFU_OUTBOUND_RTP_PAD",
    SFU_SCTP_STREAM: "SFU_SCTP_STREAM",
});

module.exports = {
    ReportTypes,
}