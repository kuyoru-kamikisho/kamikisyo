<script setup lang="ts">
import {onMounted, ref} from "vue";
// —————————————————————— data ——————————————————————
let canvas = ref<any>(null);

// —————————————————————— props ——————————————————————
let props = withDefaults(defineProps<{
  width?: number
  height?: number
  aspectRatio?: number     // 每一个格子的横向长度与纵向长度严格遵守的比例 如 16/9 或者 4/3，0表示禁用
  bgColor?: string          // 背景色
  cols?: number            // 期望的横向格子数，默认为12个，即列数
  gap?: number              // 矩形之间的间隔
  latIn?: string        // 被悬浮时的栅格背景色
  latOut?: string       // 无悬浮时的栅格背景色
  latSin?: string       // 被悬浮时的栅格描边色
  latSou?: string       // 无悬浮时的栅格描边色
  rows?: number            // 期望的纵向格子数，默认为12个，即行数
  sWidth?: number       // 描边宽度
  hvShadow?: [number, number, number, string] // 悬浮时添加阴影
  otShadow?: [number, number, number, string] // 正常状态的阴影
}>(), {
  width: 780,
  height: 440,
  aspectRatio: 1,
  cols: 12,
  gap: 0,
  bgColor: 'rgba(255,255,255,0)',
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
 * ## 重绘整个画布
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

  const width = props.width/props.rows;  // 格子的宽度
  let height = props.height/props.cols;  // 格子的高度
  const gap = props.gap;     // 格子之间的距离
  const row_num = props.rows;  // 横向的格子数量
  const col_num = props.cols;  // 纵向的格子数量
  let stroke_color = 'rgba(0,0,0,0.56)'; //描边色
  let not_hover = 'rgba(239,236,236,0.8)';
  let bg_color = '#cbf0ff'; // 画布的背景色
  let hover_color = 'rgb(241,25,25)';
  let line_width = 1; // 线宽
  let radius = 0; // 圆角半径

  // 根据格子比例重设格子高度
  if (props.aspectRatio){
    height=width*props.aspectRatio
  }

  // 初始化阶段
  reDraw(ctx, bg_color, canvas)
  ctx.lineWidth = line_width;
  ctx.strokeStyle = stroke_color;

  for (let i = 0; i < row_num; i++) {
    for (let j = 0; j < col_num; j++) {
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
  // 每次鼠标的移动都会触发重绘
  canvas.addEventListener('mousemove', (event) => {
    reDraw(ctx, bg_color, canvas)
    const x = event.offsetX;
    const y = event.offsetY;

    for (let i = 0; i < row_num; i++) {
      for (let j = 0; j < col_num; j++) {
        const rectX = i * (width + gap) + gap;
        const rectY = j * (height + gap) + gap;
        pen(ctx, rectX, rectY, radius, width, height)
        if (x >= rectX && x <= rectX + width && y >= rectY && y <= rectY + height) {
          ctx.fillStyle = hover_color;
        } else {
          ctx.fillStyle = not_hover;
        }
        ctx.fill();
        ctx.stroke();
      }
    }
  });
}


// —————————————————————— life ——————————————————————
onMounted(() => {
  if (canvas.value) {
    render(canvas.value)
  }
})

</script>

<template>
  <div>
    <canvas :width="width" :height="height" ref="canvas"></canvas>
  </div>
</template>

<style lang="less">

</style>