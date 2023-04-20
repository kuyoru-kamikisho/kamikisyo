/**
 * ## 使元素变得可以拖拽
 * * 只认准 translate3d
 * @param element
 */
export function moveElement(element: HTMLElement) {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    element.addEventListener("mousedown", dragStart);
    element.addEventListener("mouseup", dragEnd);

    function dragStart(e: MouseEvent) {
        let tsf = element.style.transform;
        if (tsf.includes('translate3d')) {
            let ns = parseTranslate3dString(tsf);
            xOffset = ns[0]
            yOffset = ns[1]
        }

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === element) {
            isDragging = true;
            document.addEventListener("mousemove", drag);
        }
    }

    function dragEnd(e: MouseEvent) {
        initialX = currentX;
        initialY = currentY;

        isDragging = false;
        document.removeEventListener('mousemove', drag)
    }

    function drag(e: MouseEvent) {
        if (isDragging) {
            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, element);
        }
    }

    function setTranslate(xPos: number, yPos: number, el: HTMLElement) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
}

/**
 * ## 读取translate3d
 * 返回这三个值构成的数组
 * @param str
 */
export function parseTranslate3dString(str: string): number[] {
    const regex = /translate3d\((\d+)px,\s*(\d+)px,\s*(\d+)px\)/;
    const matches = regex.exec(str);
    if (matches) {
        return [parseInt(matches[1]), parseInt(matches[2]), parseInt(matches[3])];
    }
    return [];
}

/**
 * ## 进位除法
 * @param a 被除数
 * @param b 除数
 */
export function division(a: number, b: number): number {
    const quotient = Math.floor(a / b);
    const remainder = a % b;

    if (a <= 0)
        return 1

    return remainder === 0 ? quotient : quotient + 1;
}

/**
 * ## 矩阵解析
 * [这里](../assets/coordinate-strategy.txt)
 * 是对应的解析策略
 * @param arr
 */
export function parseMatrix(arr: string[]): string[] {
    const [start, end] = arr.map(Number);
    const startRow = Math.floor(start / 10);
    const startCol = start % 10;
    const endRow = Math.floor(end / 10);
    const endCol = end % 10;

    const result: string[] = [];

    for (let i = startRow; i <= endRow; i++) {
        for (let j = startCol; j <= endCol; j++) {
            result.push(`${i}${j}`);
        }
    }

    return result;
}

/**
 * ## 判断A数组是否包含于B数组
 * @param A
 * @param B
 */
export function isSubset(A: any[], B: any[]) {
    const setA = new Set(A);
    for (let i = 0; i < B.length; i++) {
        if (!setA.has(B[i])) {
            return false;
        }
    }
    return true;
}

/**
 * ## 矩阵截取
 *
 * @param leftOffset 距要截取的矩形距离矩阵左侧的格子数
 * @param topOffset 距要截取的矩形距离矩阵上侧的格子数
 * @param width 矩形横向占据的格子数
 * @param height 矩形纵向占据的格子数
 */
export function getSubMatrix(leftOffset: number, topOffset: number, width: number, height: number) {
    const matrix = [];
    for (let i = topOffset; i < topOffset + height; i++) {
        for (let j = leftOffset; j < leftOffset + width; j++) {
            matrix.push(`${i}${j}`);
        }
    }
    return matrix;
}
