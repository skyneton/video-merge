document.getElementsByClassName("inputFile")[0].onchange = e => {
    const sortResult = dataSort([...e.target.files], (a, b) => 
        [a.name, b.name]
    );
    getVideos(sortResult);
    document.getElementsByClassName("inputFile")[0].value = null;
};

const dataSort = (data, callback) => {
    const collator = new Intl.Collator("en", {numeric: true, sensitivity: "base"});
    return data.sort((a, b) => {
        const t = callback(a, b);
        return collator.compare(t[0], t[1]);
    });
}

const getMaxPixels = () => {
    if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        return 3145728;
    }
    return 268435456;
}

const supportOption = () => {
    if(MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.424028, mp4a.40.2"')) return 'video/mp4; codecs="avc1.424028, mp4a.40.2"';
    if(MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
    if(MediaRecorder.isTypeSupported("video/webm;codecs=vp8,vp9,opus")) return "video/webm;codecs=vp8,vp9,opus";
    if(MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
    if(MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) return "video/webm;codecs=vp9";
    if(MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
    return "video/webm;codecs=vp8";
}

const getVideos = files => {
    const arr = [];

    files.forEach(e => {
        if(e.type.startsWith("video")) arr.push(e);
    });

    if(arr.length <= 0) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const video = window.a = document.createElement("video");
    video.defaultPlaybackRate = 8;

    const audioContext = new AudioContext();
    const audioSource = audioContext.createMediaElementSource(video);
    const destination = audioContext.createMediaStreamDestination();
    audioSource.connect(destination);

    const chunks = [];

    let currentIndex = 0;

    const mimeType = supportOption();

    const recorder = new MediaRecorder(destination.stream, {mimeType});
    canvas.captureStream(500).getTracks().forEach(e => {
        recorder.stream.addTrack(e);
    });

    const init = () => {
        const pixels = video.videoWidth * video.videoHeight;
        const maxPixels = getMaxPixels();

        let scale = 1;
        if(pixels > maxPixels) scale = maxPixels / pixels;

        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;

        video.currentTime = 0;

        recorder.resume();
    };

    video.onplay = () => {
        init();
    }

    video.onloadeddata = () => {
        video.play();
    }

    recorder.ondataavailable = e => {
        if(e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        if(currentIndex >= arr.length && chunks.length > 0) {
            const url = URL.createObjectURL(new Blob(chunks, {"type": "video/mp4"}));
            const name = `${arr[0].name}.mp4`;
            saveAs(url, name);
            URL.revokeObjectURL(url);
        }
    }

    recorder.start();
    recorder.pause();
    video.src = URL.createObjectURL(arr[currentIndex]);

    const loop = setInterval(() => {
        if(currentIndex < arr.length && recorder.state == "inactive" && video.readyState) {
        //     const tracks = recorder.stream.getTracks();
        //     recorder = new MediaRecorder(new MediaStream());
        //     tracks.forEach(e => {
        //         recorder.stream.addTrack(e);
        //     });
            recorder.start();
        }
        if(recorder.state != "recording") return;

        if(video.currentTime >= video.duration) {
            recorder.pause();
            URL.revokeObjectURL(arr[currentIndex]);

            if(++currentIndex >= arr.length) {
                recorder.stop();
                clearInterval(loop);
                return;
            }
            
            video.pause();
            video.src = URL.createObjectURL(arr[currentIndex]);
            return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }, 10);
}

const saveAs = (url, name="name.mp4") => {
    const link = document.createElement("a");
    link.target = "_blank";
    link.href = url;
    link.download = name;
    link.click();
    link.remove();
};