<script setup lang="ts">
import {onMounted, ref} from "vue";
import {division, getSubMatrix, moveElement, parseTranslate3dString} from "../script";
// —————————————————————— emits ——————————————————————
type RedrawEvent = {
  width: number // 处于交互状态的栅格的总宽度
  height: number // 处于交互状态的栅格的总高度
  row: number // 最小行占格
  col: number // 最小列占格
  left: number // 左上角格子的坐标的x偏移
  top: number // 左上角格子的坐标的y偏移
}

let emits = defineEmits<{
  (e: 'redraw', arg: RedrawEvent): void
}>();

// —————————————————————— data ——————————————————————
let domCanvas = ref<any>(null);
let corner_stack: Set<any> = new Set()

// —————————————————————— props ——————————————————————
let props = withDefaults(defineProps<{
  watchDom?: HTMLElement // 监听的Dom元素，如果传入，则该Dom元素将成为实际与canvas进行交互的元素，如果不填，则交互元素是通过插槽进入的元素的根节点，与鼠标一致，同时只能有一个元素与画布交互，因此这不是一个数组
  width?: number          // 画布的宽度
  height?: number           // 画布的高度
  pointer?: boolean      // 是否启用鼠标交互，启用后画布会和鼠标进行交互，禁用后只会和内部元素交互
  round?: number        // 格子的圆角化程度，默认为0
  aspectRatio?: number     // 每一个格子的横向长度与纵向长度严格遵守的比例 如 16/9 或者 4/3，0表示禁用
  bgColor?: string          // 背景色
  cols?: number            // 期望的横向格子数，默认为12个，即列数
  gap?: number              // 矩形之间的间隔
  laWidth?: number      // 格子的宽度，一旦设置此项，格子的高度将根据纵横比设置，此选项必须与aspectRatio配合使用
  latIn?: string        // 被悬浮时的栅格填充色
  latOut?: string       // 无悬浮时的栅格填充色
  latSin?: string       // 被悬浮时的栅格描边色
  latSou?: string       // 无悬浮时的栅格描边色
  rows?: number            // 期望的纵向格子数，默认为12个，即行数
  sWidth?: number       // 描边宽度
  cover?: boolean        // 格子是否铺满，启用此选项会使格子铺满整个画布
  hvShadow?: [number, number, number, string] // 悬浮时添加阴影
  otShadow?: [number, number, number, string] // 正常状态的阴影
  movable?: boolean        // 子元素可拖拽
  sizeable?: boolean       // 子元素可扩展
  autoPlace?: boolean       // 自动分配空间和位置，禁用此项后元素的层级样式不会被接管
  autoSize?: boolean       // 自动调整元素的大小
}>(), {
  autoPlace: true,
  autoSize: true,
  movable: true,
  sizeable: true,
  pointer: true,
  round: 0,
  cover: false,
  width: 780,
  height: 440,
  aspectRatio: 1,
  cols: 12,
  gap: 0,
  bgColor: 'rgba(40,44,52,1)',
  latIn: 'rgb(241,25,25)',
  latOut: 'rgba(239,236,236,0.8)',
  latSin: 'rgba(0,0,0,0.56)',
  latSou: 'rgba(58,147,252,0.85)',
  rows: 12,
  sWidth: 1,
  hvShadow: () => [0, 0, 0, 'rgba(0,0,0,0)'],
  otShadow: () => [0, 0, 0, 'rgba(0,0,0,0)'],
});

// —————————————————————— fun ——————————————————————

/**
 * ## 钢笔工具1
 *
 * 创建一个圆角矩形的路径
 *
 * @param ctx
 * @param x 起始点 x
 * @param y 起始点 y
 * @param radius 圆角半径
 * @param width 矩形宽度
 * @param height 矩形高度
 */
function pen(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, width: number, height: number) {
  ctx.beginPath();
  // 上直线
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  // 右上角
  ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
  // 右直线
  ctx.lineTo(x + width, y + height - radius);
  // 右下角
  ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
  // 下直线
  ctx.lineTo(x + radius, y + height);
  // 左下角
  ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
  // 左直线
  ctx.lineTo(x, y + radius);
  // 左上角
  ctx.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2);
  // 路径创建结束，闭合
  ctx.closePath();
}

/**
 * ## 为路径创建阴影
 * @param ctx
 * @param x 偏移量x
 * @param y 偏移量y
 * @param depth 阴影深度
 * @param color 颜色
 */
function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, depth: number, color = 'black') {
  ctx.shadowOffsetX = x;
  ctx.shadowOffsetY = y;
  ctx.shadowBlur = depth;
  ctx.shadowColor = color;
}

/**
 * ## 重置画布
 * 并且为画布增加背景色
 * @param ctx
 * @param c 画布的背景色
 * @param canvas
 */
function reDraw(ctx: CanvasRenderingContext2D, c: string, canvas: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = c
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

/**
 * ## 绘制格子矩阵
 * * 绘制 10 * 10 的圆角格子矩阵
 * @param canvas
 */
function render(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;

  let width = props.laWidth || props.width / props.rows;  // 格子的宽度
  let height = props.height / props.cols;  // 格子的高度
  let gap = props.gap;     // 格子之间的距离
  let row_la_num = props.rows;  // 横向的格子数量，即几列
  let col_la_num = props.cols;  // 纵向的格子数量，即几行
  let stroke_color = props.latSou; // 普通描边色
  let stroke_color_hov = props.latSin; // 被悬浮时的描边色
  let not_hover = props.latOut;
  let bg_color = props.bgColor; // 画布的背景色
  let hover_color = props.latIn;
  let line_width = props.sWidth; // 线宽
  let radius = props.round; // 圆角半径

  // 根据格子比例重设格子高度
  if (props.aspectRatio) {
    height = width * props.aspectRatio
  }

  if (props.cover) {
    if (!props.laWidth) {
      if (row_la_num)
        width = canvas.width / row_la_num - gap
      if (col_la_num)
        height = canvas.height / col_la_num - gap
    } else {
      row_la_num = (canvas.width - gap) / (width + gap)
      col_la_num = (canvas.height - gap) / (height + gap)
    }
  }

  // 初始化阶段
  reDraw(ctx, bg_color, canvas)
  ctx.lineWidth = line_width;
  ctx.strokeStyle = stroke_color;

  for (let i = 0; i < row_la_num; i++) {
    for (let j = 0; j < col_la_num; j++) {
      const x = i * (width + gap) + gap;
      const y = j * (height + gap) + gap;
      // 在该位置绘制矩形
      pen(ctx, x, y, radius, width, height)
      ctx.fillStyle = not_hover;
      // 描边
      ctx.fill()
      ctx.stroke();
    }
  }

  // 自动分配空间
  autoOccupy(width, height, gap, col_la_num, row_la_num)

  // 与鼠标/元素交互
  if (props.pointer) {
    let rectX, rectY;
    let x, y;

    // 每次鼠标的移动都会触发重绘
    canvas.addEventListener('mousemove', (event) => {
      reDraw(ctx, bg_color, canvas)
      x = event.offsetX;
      y = event.offsetY;

      for (let i = 0; i < row_la_num; i++) {
        for (let j = 0; j < col_la_num; j++) {
          rectX = i * (width + gap) + gap;
          rectY = j * (height + gap) + gap;
          pen(ctx, rectX, rectY, radius, width, height)
          if (x >= rectX && x <= rectX + width && y >= rectY && y <= rectY + height) {
            ctx.strokeStyle = stroke_color_hov
            ctx.fillStyle = hover_color;
            emits('redraw', {width: width, height: height, row: 1, col: 1, left: rectX, top: rectY})
          } else {
            ctx.strokeStyle = stroke_color
            ctx.fillStyle = not_hover;
          }
          ctx.fill();
          ctx.stroke();
        }
      }
    });
  } else {
    // 与元素交互
    let box = document.querySelector('.adb-box');
    let can = document.querySelector('canvas');

    if (box) {
      box.addEventListener('mousemove', e => {
        let tat: any = props.watchDom ?? e.target;

        let rectX, rectY,
            rect1, rect2,
            left, top, position,
            rz, cz, w, h;

        let x1: any, y1: any,
            x2: any, y2: any

        if (tat && tat !== can) {
          rect1 = tat.getBoundingClientRect();
          rect2 = can!.getBoundingClientRect();

          left = rect1.left - rect2.left;
          top = rect1.top - rect2.top;

          position = {
            left: left,
            top: top,
            right: left + rect1.width,
            bottom: top + rect1.height,
          };

          reDraw(ctx, props.bgColor, canvas)
          x1 = position.left;
          y1 = position.top;
          x2 = position.right;
          y2 = position.bottom;

          // 重绘触发事件该交互元素在自动放置时所应该具备的最小宽度与高度
          rz = division(rect1.width, width + gap);
          cz = division(rect1.height, height + gap);
          w = rz * width + gap * (rz - 1)
          h = cz * height + gap * (cz - 1)
          rectX = Math.floor((left / (width + gap))) * (width + gap) + gap
          rectY = Math.floor((top / (height + gap))) * (height + gap) + gap
          emits('redraw', {width: w, height: h, row: rz, col: cz, left: rectX, top: rectY})

          for (let i = 0; i < row_la_num; i++) {
            for (let j = 0; j < col_la_num; j++) {
              rectX = i * (width + gap) + gap;
              rectY = j * (height + gap) + gap;
              pen(ctx, rectX, rectY, radius, width, height)
              if (x2 >= rectX && x1 < rectX + width && y2 >= rectY && y1 < rectY + height) {
                ctx.strokeStyle = stroke_color_hov
                ctx.fillStyle = hover_color;
              } else {
                ctx.strokeStyle = stroke_color
                ctx.fillStyle = not_hover;
              }
              ctx.fill();
              ctx.stroke();
            }
          }
        }
      })
    }
  }
}

/**
 * ## 捕获插入进来的所有元素并自动分配位置与大小
 * 接管元素的位置大小以及定位
 * 天生具备坐标偏移的元素优先分配
 * @param lw 格子宽度
 * @param lh 格子高度
 * @param lg 格子间距
 * @param rn 总行数
 * @param cn 总列数
 */
function autoOccupy(lw: number, lh: number, lg: number, rn: number, cn: number) {
  let zrs, zcs, str, zds;

  let cmn: HTMLElement[] = [];
  let mcr: number[][] = []

  let box: any = document.querySelector('.adb-box')!;
  let children: any = box.children;
  let child, tra, n3d;
  let min_rows: number, min_cols: number;

  for (let i = 1; i < children.length; i++) {
    child = children[i];
    child.style.position = 'absolute'
    tra = child.style.transform;
    n3d = parseTranslate3dString(tra);

    // 使元素可以被拖拽
    if (props.movable)
      moveElement(child)

    // 元素需要在一行/列上占据的格子数
    min_rows = division(child.offsetWidth, lw + lg)
    min_cols = division(child.offsetHeight, lh + lg)
    // 这个元素的左上和右下两个顶角的坐标


    // 重设元素的大小
    if (props.autoSize) {
      child.style.width = min_rows * lw + lg * (min_rows - 1) + 'px'
      child.style.height = min_cols * lh + lg * (min_cols - 1) + 'px'
    }

    // 空间分配
    if (props.autoPlace) {
      if (n3d.length > 0) {
        let ofl = Math.floor((n3d[0] - lg) / (lw + lg));
        let oft = Math.floor((n3d[1] - lg) / (lh + lg));

        let xPos = lg + ofl * (lw + lg)
        let yPos = lg + oft * (lw + lg)

        let subMatrix = getSubMatrix(ofl, oft, min_rows, min_cols);

        corner_stack = new Set([...corner_stack, ...subMatrix])
        child.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`
      } else {
        cmn.push(child)
        mcr.push([min_cols, min_rows])
      }
    }
  }

  cmn.forEach(c => {
    let pop = mcr.pop()!;
    searchMyPlace(pop[0], pop[1], c)
  })

  /**
   * ## 寻找空余位置并分配
   * @param min_cols 元素在一列上需要占据的格子数
   * @param min_rows 元素在一行上需要占据的格子数
   * @param child 元素
   * @param fro 从第fro[0]行第fro[1]列开始检索是否可以被占用
   */
  function searchMyPlace(min_cols: number, min_rows: number, child: any, fro = [0, 0]): any {
    // 这个元素在该行/列预占用的格子数
    zrs = 0
    zcs = 0

    str = ''
    zds = []
    for (let j = fro[0]; j < rn; j++) {
      // 进入新行检索时重置在该行预占用的格子数
      zrs = 0

      for (let k = fro[1]; k < cn; k++) {
        // 从第j行的第k列开始尝试占用
        str = j + '' + k

        // 如果这个格子没有被占用
        if (!corner_stack.has(str)) {
          zds.push(str)
          zrs += 1

          // 如果在该行预占用的格子数等于元素在一行上需要占据的格子数
          // 结束对该行的检索，进入下一行
          if (zrs === min_rows) {
            break
          }
        } else {
          // 如果这个格子被占用了，行标不变，列标向后移动一格重新查找
          return searchMyPlace(min_cols, min_rows, child, [j, k + 1])
        }
      }

      // 进行到这里说明这一行可以被占据
      zcs += 1

      // 如果元素在该列上需要占据的格子数等于这个元素在该列预占用的格子数
      if (zcs === min_cols) {
        // 此时已经查找到了完美的左上顶点
        let xPos = lg + fro[1] * (lw + lg)
        let yPos = lg + fro[0] * (lh + lg)
        child.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`
        corner_stack = new Set([...corner_stack, ...zds])
        break
      }
    }
  }
}

// —————————————————————— life ——————————————————————
onMounted(() => {
  if (domCanvas.value) {
    render(domCanvas.value)
  }
})

</script>

<template>
  <div :style="`max-width:${width}px;max-height:${height}px;`" class="adb-box">
    <canvas class="adb-canvas" :width="width" :height="height" ref="domCanvas"></canvas>
    <slot>
      <!-- 组件会自动接管所有插入进来的dom元素并控制他们的位置、大小等信息 -->
    </slot>
  </div>
</template>

<style lang="scss">
.adb-box {
  position: relative;

  .adb-canvas {
    position: absolute;
    left: 0;
    top: 0;
  }
}
</style>