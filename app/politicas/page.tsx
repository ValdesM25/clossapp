import Link from "next/link"
import type { Metadata } from "next"
import { LEGAL_CONTACTO, LEGAL_VIGENCIA } from "@/constants/legal"
import { NOMBRE_PLAN, PLANES } from "@/constants/planes"

export const metadata: Metadata = {
  title: "Políticas y Términos · Clossapp",
  description:
    "Aviso de privacidad, términos de uso, reglas del marketplace, planes, cancelación y reembolsos de Clossapp.",
}

const secciones = [
  { id: "privacidad", label: "Aviso de Privacidad" },
  { id: "terminos", label: "Términos de Uso" },
  { id: "marketplace", label: "Marketplace" },
  { id: "planes", label: "Planes y pagos" },
  { id: "reembolsos", label: "Cancelación y reembolsos" },
  { id: "contacto", label: "Contacto" },
]

function Seccion({ id, numero, titulo, children }: {
  id: string; numero: string; titulo: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8 flex flex-col gap-4">
      <div className="border-t border-zinc-200 pt-6">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">{numero}</p>
        <h2 className="font-serif text-xl text-zinc-900 mt-0.5">{titulo}</h2>
      </div>
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-zinc-600">
        {children}
      </div>
    </section>
  )
}

function Sub({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-zinc-900 tracking-wide">{titulo}</h3>
      {children}
    </div>
  )
}

export default function PoliticasPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors w-fit">
            ← Volver a Clossapp
          </Link>
          <div>
            <h1 className="font-serif text-3xl text-zinc-900 mt-1">Políticas y Términos</h1>
          </div>
          <p className="text-[15px] leading-relaxed text-zinc-600">
            Este documento explica qué información recabamos, para qué la usamos, con quién
            la compartimos y bajo qué reglas funciona Clossapp. Está redactado para leerse,
            no para esconder nada.
          </p>
          <p className="text-xs text-zinc-500">Última actualización: {LEGAL_VIGENCIA}</p>
        </header>

        <nav className="border border-zinc-200 p-4 flex flex-col gap-1.5">
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">Contenido</p>
          {secciones.map((s, i) => (
            <a key={s.id} href={`#${s.id}`}
              className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              {String(i + 1).padStart(2, "0")} · {s.label}
            </a>
          ))}
        </nav>

        <Seccion id="privacidad" numero="01" titulo="Aviso de Privacidad">
          <p>
            En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión
            de los Particulares (LFPDPPP) y su Reglamento, ponemos a tu disposición el
            presente aviso.
          </p>

          <Sub titulo="Responsable del tratamiento">
            <p>
              El responsable de tus datos personales es Clossapp, con domicilio en Saltillo,
              Coahuila de Zaragoza, México. Puedes contactarnos en{" "}
              <a href={`mailto:${LEGAL_CONTACTO}`} className="text-zinc-900 underline underline-offset-2">
                {LEGAL_CONTACTO}
              </a>.
            </p>
          </Sub>

          <Sub titulo="Datos que recabamos">
            <p>Recabamos únicamente lo necesario para operar la aplicación:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li><strong className="font-medium text-zinc-900">Identificación y contacto:</strong> nombre de usuario y correo electrónico.</li>
              <li><strong className="font-medium text-zinc-900">Fotografías de tus prendas:</strong> las imágenes que subes a tu armario digital.</li>
              <li><strong className="font-medium text-zinc-900">Atributos de prenda:</strong> categoría, color, estilo, talla, estado de uso, precio y descripción — generados por análisis automatizado o capturados por ti.</li>
              <li><strong className="font-medium text-zinc-900">Actividad dentro de la app:</strong> frecuencia de uso de prendas, registros de reparación y publicaciones en el marketplace.</li>
              <li><strong className="font-medium text-zinc-900">Datos de suscripción:</strong> tu plan, su estado y fecha de renovación, y los identificadores de cliente y suscripción que nos asigna Stripe.</li>
              <li><strong className="font-medium text-zinc-900">Ubicación aproximada, opcional:</strong> si das permiso, la ubicación de tu dispositivo para consultar el clima del día. No la guardamos.</li>
              <li><strong className="font-medium text-zinc-900">Notificaciones, opcional:</strong> si las activas, el identificador que tu navegador nos da para enviarte avisos.</li>
              <li><strong className="font-medium text-zinc-900">Datos técnicos:</strong> métricas anónimas de navegación y rendimiento.</li>
            </ul>
            <p className="text-[13px] text-zinc-500 border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              No solicitamos datos personales sensibles. Los datos de tu tarjeta los captura y
              procesa Stripe directamente: Clossapp nunca los ve ni los guarda.
            </p>
          </Sub>

          <Sub titulo="Finalidades del tratamiento">
            <p><strong className="font-medium text-zinc-900">Primarias</strong>, necesarias para prestarte el servicio: crear y autenticar tu cuenta; almacenar y organizar tu armario digital; generar recomendaciones de outfits; cobrar y administrar tu suscripción si eliges un plan de pago; habilitar la publicación de prendas en venta, renta o donación; y darte soporte.</p>
            <p><strong className="font-medium text-zinc-900">Secundarias</strong>, que puedes rechazar sin que se te niegue el servicio: mejorar la aplicación mediante análisis estadístico agregado, y enviarte comunicaciones sobre novedades del producto.</p>
            <p>Si no deseas que tus datos se usen para las finalidades secundarias, escríbenos a{" "}
              <a href={`mailto:${LEGAL_CONTACTO}`} className="text-zinc-900 underline underline-offset-2">{LEGAL_CONTACTO}</a>{" "}
              en cualquier momento.
            </p>
          </Sub>

          <Sub titulo="Transferencias y encargados">
            <p>
              Para operar, compartimos determinada información con proveedores que actúan
              como encargados del tratamiento. Ninguno de ellos comercializa tus datos.
            </p>
            <div className="border border-zinc-200">
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">Anthropic PBC (Estados Unidos)</p>
                <p className="text-[14px] mt-1">
                  Cuando usas el análisis automático de prendas o el generador de outfits,{" "}
                  <strong className="font-medium text-zinc-900">
                    las fotografías de tus prendas y el inventario de tu armario se transmiten
                    a los servidores de Anthropic
                  </strong>{" "}
                  para ser procesados por sus modelos de inteligencia artificial (Claude). Este
                  procesamiento es indispensable para dichas funciones: si no aceptas esta
                  transferencia, puedes seguir usando Clossapp capturando tus prendas de forma manual.
                </p>
              </div>
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">Supabase Inc. (Estados Unidos)</p>
                <p className="text-[14px] mt-1">
                  Provee la base de datos, el almacenamiento de tus fotografías y el sistema de
                  autenticación.
                </p>
              </div>
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">Stripe, Inc. y sus filiales (Estados Unidos)</p>
                <p className="text-[14px] mt-1">
                  Procesa los pagos de las suscripciones. Recibe tu correo, los datos de tu tarjeta y
                  los de cada cobro, y los trata conforme a su propio{" "}
                  <a href="https://stripe.com/mx/privacy" target="_blank" rel="noopener noreferrer" className="text-zinc-900 underline underline-offset-2">aviso de privacidad</a>.
                </p>
              </div>
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">Open-Meteo (Suiza)</p>
                <p className="text-[14px] mt-1">
                  Si permites tu ubicación, recibe las coordenadas aproximadas de tu dispositivo para
                  devolver el clima del día. No recibe tu nombre ni tu correo.
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">Vercel Inc. (Estados Unidos)</p>
                <p className="text-[14px] mt-1">
                  Aloja la aplicación y provee métricas agregadas de uso y rendimiento.
                </p>
              </div>
            </div>
            <p className="text-[14px]">
              Estas transferencias implican que tus datos se procesan fuera de México. Al usar
              Clossapp consientes dicha transferencia internacional en términos del artículo 37
              de la LFPDPPP.
            </p>
          </Sub>

          <Sub titulo="Conservación de datos">
            <p>
              Conservamos tu información mientras tu cuenta esté activa. Si solicitas la
              eliminación de tu cuenta, tus datos personales y fotografías se eliminan de
              nuestros sistemas productivos en un plazo de entre tres y seis meses, salvo
              aquello que debamos conservar por obligación legal. Los respaldos que contengan
              tu información se sobrescriben dentro de ese mismo periodo.
            </p>
          </Sub>

          <Sub titulo="Derechos ARCO">
            <p>
              Tienes derecho a <strong className="font-medium text-zinc-900">acceder</strong> a tus
              datos, <strong className="font-medium text-zinc-900">rectificarlos</strong> cuando sean
              inexactos, <strong className="font-medium text-zinc-900">cancelarlos</strong> cuando
              consideres que no se requieren, y{" "}
              <strong className="font-medium text-zinc-900">oponerte</strong> a su uso para fines
              específicos. También puedes revocar el consentimiento que nos otorgaste.
            </p>
            <p>
              Para ejercer cualquiera de estos derechos, envía tu solicitud a{" "}
              <a href={`mailto:${LEGAL_CONTACTO}`} className="text-zinc-900 underline underline-offset-2">{LEGAL_CONTACTO}</a>{" "}
              indicando tu nombre de usuario, el derecho que deseas ejercer y un medio de
              contacto. Responderemos en un plazo máximo de 20 días hábiles.
            </p>
          </Sub>

          <Sub titulo="Cookies y tecnologías de rastreo">
            <p>
              Usamos almacenamiento local del navegador para mantener tu sesión iniciada, y
              analítica agregada que no te identifica individualmente. No utilizamos cookies
              publicitarias de terceros.
            </p>
          </Sub>

          <Sub titulo="Cambios a este aviso">
            <p>
              Podemos actualizar este aviso conforme evolucione la aplicación o la normativa
              aplicable. Publicaremos la versión vigente en esta misma página, indicando la
              fecha de última actualización. Los cambios sustanciales se te notificarán por
              correo electrónico.
            </p>
          </Sub>
        </Seccion>

        <Seccion id="terminos" numero="02" titulo="Términos de Uso">
          <Sub titulo="Acceso a la plataforma">
            <p>
              Puedes crear una cuenta con tu correo electrónico o con los proveedores de identidad
              disponibles en la pantalla de entrada. Clossapp está en desarrollo activo, por lo que
              sus funciones pueden cambiar.
            </p>
            <p>
              Existe además un modo invitado con datos de demostración, que no requiere cuenta y
              no almacena información personal.
            </p>
          </Sub>

          <Sub titulo="Tu cuenta">
            <p>
              Debes ser mayor de edad para usar Clossapp. Eres responsable de la veracidad de la
              información que registras y de mantener la confidencialidad de tus credenciales.
              Notifícanos de inmediato si detectas un uso no autorizado de tu cuenta.
            </p>
          </Sub>

          <Sub titulo="Contenido que subes">
            <p>
              Conservas la titularidad de las fotografías y textos que publicas. Al subirlos, nos
              otorgas una licencia limitada, no exclusiva y revocable para almacenarlos,
              procesarlos y mostrarlos dentro de la aplicación con el único fin de prestarte el
              servicio. Esta licencia termina cuando eliminas el contenido o tu cuenta.
            </p>
            <p>
              Te comprometes a subir únicamente fotografías sobre las que tengas derechos, y a no
              publicar imágenes de terceros sin su consentimiento.
            </p>
          </Sub>

          <Sub titulo="Sobre los resultados de inteligencia artificial">
            <p>
              Las categorías, descripciones, estimaciones de precio y sugerencias de outfit que
              genera Clossapp son producidas por modelos automatizados y tienen carácter{" "}
              <strong className="font-medium text-zinc-900">orientativo</strong>. Pueden contener
              errores o imprecisiones. Cualquier precio sugerido es una referencia editable: la
              decisión final sobre el precio de publicación es siempre tuya, y no constituye un
              avalúo ni una garantía de valor de mercado.
            </p>
          </Sub>

          <Sub titulo="Uso aceptable">
            <p>
              No está permitido usar Clossapp para publicar contenido ilícito, ofensivo o que
              infrinja derechos de terceros; intentar acceder a cuentas o datos ajenos; extraer
              información de forma automatizada; ni interferir con el funcionamiento del servicio.
              Podemos suspender cuentas que incumplan estas reglas.
            </p>
          </Sub>

          <Sub titulo="Disponibilidad y limitación de responsabilidad">
            <p>
              El servicio se ofrece “tal cual”, sin garantía de disponibilidad ininterrumpida. Al
              tratarse de una plataforma en fase de prueba, pueden ocurrir interrupciones,
              cambios de funcionalidad o pérdida de datos. Te recomendamos conservar copia de las
              fotografías que consideres importantes.
            </p>
          </Sub>

          <Sub titulo="Legislación aplicable">
            <p>
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier
              controversia se someterá a los tribunales competentes de
              Saltillo, Coahuila de Zaragoza, renunciando a cualquier otro
              fuero. En materia de protección al consumidor, la PROFECO es competente.
            </p>
          </Sub>
        </Seccion>

        <Seccion id="marketplace" numero="03" titulo="Uso del Marketplace">
          <p className="text-[14px]">
            Comprar, vender y rentar prendas está disponible en los planes Plus y Elite. Con el plan
            Esencial puedes donar ropa a los centros de acopio y ganar puntos.
          </p>
          <Sub titulo="Nuestro rol">
            <p>
              Clossapp es un{" "}
              <strong className="font-medium text-zinc-900">espacio de encuentro</strong> entre
              personas que desean vender, rentar o donar prendas, y cobramos y guardamos el pago mientras
              se entrega la prenda. No compramos, no vendemos y no somos propietarios de las prendas publicadas.
            </p>
          </Sub>

          <Sub titulo="Pagos, custodia y comisión">
            <p>
              Las compras y rentas se pagan con tarjeta a través de Stripe. El pago queda en custodia
              en la cuenta de Clossapp y no se entrega a quien vende hasta que la prenda se recoge en el
              centro de acopio y el centro confirma la entrega con el código QR del pedido. En una renta,
              el pago se libera cuando la prenda se devuelve.
            </p>
            <p>
              Clossapp cobra una comisión del 15% sobre el precio de cada venta o renta; quien vende recibe
              el 85% restante. Las comisiones de procesamiento de Stripe las absorbe Clossapp. Para recibir
              su dinero, quien vende debe tener una cuenta de cobro en Stripe, que pide verificar su
              identidad y una cuenta bancaria (CLABE) a su nombre. Si al liberarse un pago aún no la tiene,
              el pago espera hasta que la conecte.
            </p>
            <p>
              Si un pedido se cancela antes de la entrega, se reembolsa el total a la tarjeta con la que se
              pagó. Un pago que no se completa en 30 minutos se cancela solo y las prendas vuelven a estar
              disponibles. Las rentas pueden reservarse con hasta dos meses de anticipación.
            </p>
          </Sub>

          <Sub titulo="Responsabilidad de quien publica">
            <p>
              Si publicas una prenda, declaras que es de tu propiedad, que puedes disponer de
              ella legalmente y que la descripción, las fotografías y el estado declarado
              corresponden a la realidad. Los defectos relevantes deben señalarse de forma
              visible.
            </p>
          </Sub>

          <Sub titulo="Responsabilidad de quien aparta">
            <p>
              Al pagar una prenda te comprometes a recogerla en el centro de acopio indicado. Revísala
              al recogerla: si no corresponde a lo publicado, no confirmes la entrega y escríbenos para
              cancelar el pedido.
            </p>
          </Sub>

          <Sub titulo="Renta">
            <p>
              Sólo determinadas categorías, como vestidos y accesorios, están habilitadas para
              renta. Quien renta se compromete a devolver la prenda en la fecha acordada y en
              condiciones equivalentes a las recibidas, salvo el desgaste normal de uso. Los
              acuerdos sobre daños o retrasos son entre las partes.
            </p>
          </Sub>

          <Sub titulo="Donaciones">
            <p>
              El módulo de donaciones permite ofrecer prendas sin fines de lucro. No se cobra
              comisión ni contraprestación alguna por este uso. Las prendas donadas deben estar
              en condiciones dignas de uso.
            </p>
          </Sub>

          <Sub titulo="Prohibiciones">
            <p>
              No pueden publicarse artículos falsificados o que infrinjan marcas registradas,
              productos robados o de procedencia ilícita, ropa interior usada, ni artículos cuya
              comercialización esté restringida por la ley. Tampoco está permitido usar el
              marketplace para operaciones ajenas al intercambio de prendas.
            </p>
          </Sub>
        </Seccion>

        <Seccion id="planes" numero="04" titulo="Planes y pagos">
          <div className="border border-zinc-200">
            {PLANES.map((p, i) => (
              <div key={p.id} className={i < PLANES.length - 1 ? "border-b border-zinc-200 px-4 py-4" : "px-4 py-4"}>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{NOMBRE_PLAN[p.id]}</p>
                <p className="font-serif text-lg text-zinc-900 mt-0.5">
                  {p.precio ? `$${p.precio} MXN al mes, IVA incluido` : "Sin costo"}
                </p>
                <p className="text-[14px] mt-2">{p.incluye.join(" · ")}.</p>
              </div>
            ))}
          </div>
          <p className="text-[14px]">
            También existe un modo de demostración con datos de ejemplo, sin cuenta y sin costo, que
            no guarda información ni usa inteligencia artificial.
          </p>

          <Sub titulo="Cómo se cobra">
            <p>
              Plus y Elite son suscripciones mensuales que se pagan por adelantado con tarjeta de
              crédito o débito a través de Stripe. Al contratar, autorizas que el mismo cargo se haga
              cada mes, en la misma fecha, hasta que canceles. Los precios están en pesos mexicanos e
              incluyen IVA.
            </p>
          </Sub>

          <Sub titulo="Uso justo">
            <p>
              Los outfits y análisis con inteligencia artificial de Plus y Elite están pensados para el
              uso personal de tu clóset y se rigen por una política de uso justo. Para que el servicio
              funcione bien para todas las personas, podemos limitar cuántos se generan en un mismo día
              cuando el uso supera por mucho lo normal. Si llegas a ese tope, la app te avisa y puedes
              seguir al día siguiente; el resto de la app funciona igual.
            </p>
          </Sub>

          <Sub titulo="Cambios de plan">
            <p>
              Puedes pasar de Plus a Elite, o al revés, en cualquier momento. Al subir de plan se cobra
              en ese momento la diferencia proporcional a los días que faltan del periodo. Al bajar, la
              diferencia queda como saldo a tu favor y se descuenta de tus siguientes cobros.
            </p>
          </Sub>

          <Sub titulo="Si un cobro no pasa">
            <p>
              Stripe reintenta el cobro durante algunos días y conservas tu plan mientras tanto. Si no se
              logra cobrar, tu cuenta regresa al plan Esencial. Tus prendas se conservan, pero no podrás
              agregar más mientras superes el tope de ese plan.
            </p>
          </Sub>

          <Sub titulo="Cambios de precio">
            <p>
              Los precios publicados pueden cambiar. Si cambia el precio de tu plan, te avisaremos por
              correo antes de tu siguiente renovación y el nuevo precio aplicará a partir de ella. Si no
              estás de acuerdo, puedes cancelar antes de esa fecha.
            </p>
          </Sub>
        </Seccion>

        <Seccion id="reembolsos" numero="05" titulo="Cancelación y reembolsos">
          <Sub titulo="Cancelar">
            <p>
              Puedes cancelar cuando quieras, sin penalización, en{" "}
              <Link href="/planes" className="text-zinc-900 underline underline-offset-2">www.clossapp.com/planes</Link>{" "}
              → Administrar suscripción. Conservas tu plan hasta el final del periodo que ya pagaste; después tu cuenta
              pasa al plan Esencial y no se hace ningún otro cargo.
            </p>
          </Sub>

          <Sub titulo="Reembolsos">
            <p>
              Como puedes cancelar en cualquier momento y conservas el plan hasta el final del periodo
              pagado, no hacemos reembolsos proporcionales por los días que no uses.
            </p>
            <p>
              Sí reembolsamos completo cualquier cargo duplicado o hecho por error. Escríbenos a{" "}
              <a href={`mailto:${LEGAL_CONTACTO}`} className="text-zinc-900 underline underline-offset-2">{LEGAL_CONTACTO}</a>{" "}
              dentro de los 30 días siguientes al cargo, con el correo de tu cuenta y la fecha del cobro.
              Los reembolsos aprobados se hacen a la misma tarjeta y pueden tardar de 5 a 10 días hábiles
              en reflejarse, según tu banco.
            </p>
            <p className="text-[14px]">
              Nada de lo anterior limita los derechos que te da la Ley Federal de Protección al
              Consumidor.
            </p>
          </Sub>
        </Seccion>

        <Seccion id="contacto" numero="06" titulo="Contacto">
          <p>
            Para dudas sobre estas políticas, cobros o reembolsos, solicitudes de derechos ARCO,
            reportes de contenido o soporte general, escríbenos a{" "}
            <a href={`mailto:${LEGAL_CONTACTO}`} className="text-zinc-900 underline underline-offset-2">
              {LEGAL_CONTACTO}
            </a>.
          </p>
          <p className="text-[14px]">
            Atendemos solicitudes en días hábiles. Para temas de privacidad, el plazo máximo de
            respuesta es de 20 días hábiles conforme a la LFPDPPP.
          </p>
        </Seccion>

        <footer className="border-t border-zinc-200 pt-6 flex flex-col gap-3">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors w-fit">
            ← Volver a Clossapp
          </Link>
        </footer>
      </div>
    </main>
  )
}
