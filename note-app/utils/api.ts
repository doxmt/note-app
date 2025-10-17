export const API_BASE = 'http://192.168.0.86:5001';
export const API_BASE_QUIZ = 'http://192.168.0.86:5050';
// utils/api.ts

// 🚨 실제 사용하는 서버 주소로 반드시 변경해야 합니다.
export const BASE_URL = 'http://192.168.0.86:5001';

// 서버와 주고받을 필기 데이터의 형식을 정의합니다.
interface StrokeData {
    pathString: string;
    color: string;
    width: number;
}

/**
 * [신규] 특정 노트의 페이지 이미지 URL 목록을 가져옵니다.
 * 서버로부터 이미지 ID 배열을 받아 완전한 API URL 배열로 변환합니다.
 */
// utils/api.ts

export const getPageImageUrls = async (noteId: string): Promise<string[]> => {
    const url = `${BASE_URL}/api/notes/${noteId}/pages`;
    try {
        const response = await fetch(url);

        if (!response.ok) {
            // ✨ 어떤 오류인지 상태 코드를 함께 출력하도록 수정합니다.
            const errorText = await response.text();
            console.error(`서버 응답 오류: ${response.status} ${response.statusText}`, errorText);
            throw new Error('페이지 이미지를 불러오지 못했습니다.');
        }

        const pageIds = await response.json();
        if (!Array.isArray(pageIds)) return [];
        return pageIds.map(id => `${BASE_URL}/api/notes/page/${id}`);
    } catch (error) {
        console.error(`페이지 이미지 URL 로딩 실패:`, error);
        throw error;
    }
};
/**
 * 특정 노트의 필기(strokes) 데이터를 서버에서 가져옵니다.
 */
export const getStrokesForNote = async (noteId: string): Promise<StrokeData[]> => {
    const url = `${BASE_URL}/api/notes/${noteId}/strokes`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error('필기 데이터를 불러오지 못했습니다.');
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('필기 데이터 로딩 실패:', error);
        throw error;
    }
};

/**
 * 특정 노트에 필기(strokes) 데이터를 저장합니다.
 */
export const saveStrokesForNote = async (noteId: string, strokes: StrokeData[]): Promise<any> => {
    const url = `${BASE_URL}/api/notes/${noteId}/strokes`;
    try {
        const response = await fetch(url, {
            method: 'PUT', // POST 대신 PUT 사용 (데이터 전체를 교체하는 개념)
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(strokes),
        });

        if (!response.ok) {
            throw new Error('필기 저장에 실패했습니다.');
        }
        return await response.json();
    } catch (error) {
        console.error('필기 저장 실패:', error);
        throw error;
    }
};